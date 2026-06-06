import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ChantierCard } from "@/components/chantier-card";
import { Plus } from "lucide-react";

// Le typage auto-généré de Supabase ne sait pas inférer l'agrégat
// `chantier_intervenants(count)`, donc on annote explicitement.
type ChantierListItem = {
  id: string;
  titre: string;
  ville: string | null;
  code_postal: string | null;
  photo_principale_url: string;
  created_at: string;
  chantier_intervenants: { count: number }[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chantiers } = await supabase
    .from("chantiers")
    .select(
      `id, titre, ville, code_postal, photo_principale_url, created_at,
       chantier_intervenants(count)`
    )
    // Toujours "mes" chantiers, même pour un admin (qui a une vue équipe
    // dédiée sur /admin). Sans ce filtre, la RLS admin renverrait tout.
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ChantierListItem[]>();

  const enriched = await Promise.all(
    (chantiers ?? []).map(async (c) => {
      const { data: signed } = await supabase.storage
        .from("chantier-photos")
        .createSignedUrl(c.photo_principale_url, 1800);
      return {
        ...c,
        signedUrl: signed?.signedUrl ?? null,
        nbIntervenants: c.chantier_intervenants?.[0]?.count ?? 0,
      };
    })
  );

  return (
    <main className="container max-w-3xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">Mes chantiers</h1>

      {enriched.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">Aucun chantier pour l&apos;instant.</p>
          <p className="text-sm">
            Clique sur le bouton ci-dessous pour ajouter ton premier panneau.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {enriched.map((c) => (
            <ChantierCard
              key={c.id}
              id={c.id}
              titre={c.titre}
              ville={c.ville}
              codePostal={c.code_postal}
              photoUrl={c.signedUrl}
              nbIntervenants={c.nbIntervenants}
              createdAt={c.created_at}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-4 left-4 right-4">
        <Link href="/nouveau">
          <Button size="lg" className="w-full h-14 text-lg shadow-lg">
            <Plus className="size-6 mr-2" />
            Nouveau chantier
          </Button>
        </Link>
      </div>
    </main>
  );
}
