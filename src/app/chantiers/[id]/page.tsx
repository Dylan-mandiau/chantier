import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

// Le typage auto-généré de Supabase ne sait pas inférer la jointure
// `entreprise:entreprises(...)` (alias + relation belongs-to), donc on annote
// le retour explicitement avec .returns<T>().
type IntervenantRow = {
  id: string;
  role: string;
  lot_numero: string | null;
  lot_intitule: string | null;
  rang: number;
  ordre: number | null;
  entreprise: {
    id: string;
    raison_sociale: string;
    telephone: string | null;
    email: string | null;
    ville: string | null;
  } | null;
};

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chantier } = await supabase
    .from("chantiers")
    .select("*")
    .eq("id", id)
    .single();

  if (!chantier) notFound();

  const { data: intervenants } = await supabase
    .from("chantier_intervenants")
    .select(
      `id, role, lot_numero, lot_intitule, rang, ordre,
       entreprise:entreprises(id, raison_sociale, telephone, email, ville)`
    )
    .eq("chantier_id", id)
    .order("ordre", { ascending: true })
    .returns<IntervenantRow[]>();

  const { data: signed } = await supabase.storage
    .from("chantier-photos")
    .createSignedUrl(chantier.photo_principale_url, 1800);

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4">
      <Link href="/">
        <Button variant="ghost" size="sm">← Retour</Button>
      </Link>

      {signed?.signedUrl && (
        <Card>
          <CardContent className="p-2">
            <Image
              src={signed.signedUrl}
              alt={chantier.titre}
              width={800}
              height={600}
              className="rounded w-full h-auto"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{chantier.titre}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {chantier.adresse && <p>📍 {chantier.adresse}</p>}
          {(chantier.ville || chantier.code_postal) && (
            <p>{chantier.code_postal} {chantier.ville}</p>
          )}
          {chantier.permis_construire && <p>📅 {chantier.permis_construire}</p>}
          {chantier.montant_travaux_ht != null && (
            <p>💰 {chantier.montant_travaux_ht.toLocaleString("fr-FR")} € HT</p>
          )}
          {chantier.notes && (
            <p className="italic text-muted-foreground pt-2">📝 {chantier.notes}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intervenants ({intervenants?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {intervenants?.map((it) => {
            const ent = it.entreprise;
            if (!ent) return null;
            return (
              <div key={it.id} className="border rounded p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {it.lot_numero ? `Lot ${it.lot_numero}` : it.role.replace(/_/g, " ")}
                  </Badge>
                  {it.lot_intitule && (
                    <span className="text-xs text-muted-foreground">{it.lot_intitule}</span>
                  )}
                </div>
                <p className="font-medium">{ent.raison_sociale}</p>
                <div className="flex flex-wrap gap-2">
                  {ent.telephone && (
                    <a
                      href={`tel:${ent.telephone}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      📞 {ent.telephone}
                    </a>
                  )}
                  {ent.email && (
                    <a
                      href={`mailto:${ent.email}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      📧 {ent.email}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
