import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteChantierButton } from "@/components/delete-chantier-button";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import { PremierContactButton } from "@/components/premier-contact-button";
import { PlanifierRelanceButton } from "@/components/planifier-relance-button";
import {
  computeStatutCommercial,
  type StatutInputs,
} from "@/lib/statut/compute";
import { Pencil } from "lucide-react";

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

  // === Phase 5 : enrichir avec statut commercial par intervenant ===
  const entrepriseIds = (intervenants ?? [])
    .map((it) => it.entreprise?.id)
    .filter((x): x is string => !!x);

  const safeIds =
    entrepriseIds.length > 0
      ? entrepriseIds
      : ["00000000-0000-0000-0000-000000000000"];

  const [contactsRes, relancesRes, entreprisesRes, profileRes] =
    await Promise.all([
      supabase
        .from("contacts_envoyes")
        .select("entreprise_id, statut, envoye_at")
        .in("entreprise_id", safeIds)
        .order("envoye_at", { ascending: false }),
      supabase
        .from("relances")
        .select("entreprise_id, date_relance, motif")
        .in("entreprise_id", safeIds)
        .eq("status", "planifiee")
        .gte("date_relance", new Date().toISOString().slice(0, 10))
        .order("date_relance", { ascending: true }),
      supabase
        .from("entreprises")
        .select("id, code_client_salti")
        .in("id", safeIds),
      supabase
        .from("profiles")
        .select("nom, prenom, email")
        .eq("id", user.id)
        .single(),
    ]);

  const codeClientByEnt = new Map<string, string | null>();
  (entreprisesRes.data ?? []).forEach((e) =>
    codeClientByEnt.set(e.id, e.code_client_salti)
  );

  const lastContactByEnt = new Map<
    string,
    NonNullable<StatutInputs["dernierContact"]>
  >();
  (contactsRes.data ?? []).forEach((c) => {
    if (!lastContactByEnt.has(c.entreprise_id)) {
      lastContactByEnt.set(c.entreprise_id, {
        statut: c.statut,
        envoye_at: c.envoye_at,
      });
    }
  });

  const nextRelanceByEnt = new Map<
    string,
    NonNullable<StatutInputs["prochaineRelance"]>
  >();
  (relancesRes.data ?? []).forEach((r) => {
    if (!nextRelanceByEnt.has(r.entreprise_id)) {
      nextRelanceByEnt.set(r.entreprise_id, {
        date_relance: r.date_relance,
        motif: r.motif,
      });
    }
  });

  const today = new Date().toISOString().slice(0, 10);
  const profile = profileRes.data;
  const commercialNom =
    profile?.prenom && profile?.nom
      ? `${profile.prenom} ${profile.nom}`
      : profile?.email ?? "Commercial SALTI";

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/chantiers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="size-3.5 mr-1" />
              Modifier
            </Button>
          </Link>
          <DeleteChantierButton chantierId={id} chantierTitre={chantier.titre} />
        </div>
      </div>

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
            const statut = computeStatutCommercial({
              codeClientSalti: codeClientByEnt.get(ent.id) ?? null,
              dernierContact: lastContactByEnt.get(ent.id) ?? null,
              prochaineRelance: nextRelanceByEnt.get(ent.id) ?? null,
              today,
            });
            return (
              <div key={it.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {it.lot_numero ? `Lot ${it.lot_numero}` : it.role.replace(/_/g, " ")}
                  </Badge>
                  {it.lot_intitule && (
                    <span className="text-xs text-muted-foreground">{it.lot_intitule}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{ent.raison_sociale}</p>
                  <StatutCommercialBadge statut={statut} />
                </div>
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
                  <PremierContactButton
                    entreprise={{
                      id: ent.id,
                      raison_sociale: ent.raison_sociale,
                      email: ent.email,
                      code_client_salti: codeClientByEnt.get(ent.id) ?? null,
                    }}
                    commercialNom={commercialNom}
                    intervenantContext={{
                      intervenant_id: it.id,
                      chantier_titre: chantier.titre,
                      lot_numero: it.lot_numero,
                      lot_intitule: it.lot_intitule,
                    }}
                  />
                  <PlanifierRelanceButton
                    entrepriseId={ent.id}
                    entrepriseNom={ent.raison_sociale}
                    chantierId={chantier.id}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
