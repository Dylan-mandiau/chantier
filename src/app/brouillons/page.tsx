import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BrouillonsClient, type BrouillonItem } from "./BrouillonsClient";

type BrouillonRow = {
  id: string;
  titre: string;
  ville: string | null;
  code_postal: string | null;
  photo_principale_url: string;
  created_at: string;
  chantier_intervenants: { count: number }[];
};

export default async function BrouillonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mes brouillons : scans auto-enregistrés mais pas encore validés. Personnels
  // (created_by = moi), les plus récents d'abord.
  const { data: rows } = await supabase
    .from("chantiers")
    .select(
      `id, titre, ville, code_postal, photo_principale_url, created_at,
       chantier_intervenants(count)`
    )
    .eq("created_by", user.id)
    .eq("status", "brouillon")
    .order("created_at", { ascending: false })
    .returns<BrouillonRow[]>();

  const admin = createAdminClient();
  const items: BrouillonItem[] = await Promise.all(
    (rows ?? []).map(async (c) => {
      const { data: signed } = await admin.storage
        .from("chantier-photos")
        .createSignedUrl(c.photo_principale_url, 1800);
      return {
        id: c.id,
        titre: c.titre,
        ville: c.ville,
        code_postal: c.code_postal,
        photoUrl: signed?.signedUrl ?? null,
        nbIntervenants: c.chantier_intervenants?.[0]?.count ?? 0,
        createdAt: c.created_at,
      };
    })
  );

  return (
    <main className="container max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Mes brouillons</h1>
        <div className="w-20" />
      </div>

      <p className="text-sm text-muted-foreground">
        Tes scans sont enregistrés ici automatiquement. Valide-les pour les
        publier sur le tableau de bord, ou supprime ceux dont tu n&apos;as pas
        besoin.
      </p>

      <BrouillonsClient items={items} />
    </main>
  );
}
