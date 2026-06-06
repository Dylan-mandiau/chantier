import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteChantierButton } from "@/components/delete-chantier-button";
import {
  IntervenantsList,
  type IntervenantItem,
} from "@/components/intervenants-list";
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

  // Items préparés (statut calculé côté serveur) pour la liste cliente.
  const intervenantItems: IntervenantItem[] = (intervenants ?? [])
    .filter((it) => it.entreprise)
    .map((it) => {
      const ent = it.entreprise!;
      const statut = computeStatutCommercial({
        codeClientSalti: codeClientByEnt.get(ent.id) ?? null,
        dernierContact: lastContactByEnt.get(ent.id) ?? null,
        prochaineRelance: nextRelanceByEnt.get(ent.id) ?? null,
        today,
      });
      return {
        id: it.id,
        role: it.role,
        lot_numero: it.lot_numero,
        lot_intitule: it.lot_intitule,
        entreprise_id: ent.id,
        raison_sociale: ent.raison_sociale,
        telephone: ent.telephone,
        email: ent.email,
        statut,
        code_client_salti: codeClientByEnt.get(ent.id) ?? null,
      };
    });

  return (
    <main className="container max-w-5xl mx-auto p-4 space-y-4">
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

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* Colonne gauche : photo compacte + infos projet */}
        <div className="space-y-4 lg:col-span-1">
          {signed?.signedUrl && (
            <a
              href={signed.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="block group"
              title="Cliquer pour agrandir la photo"
            >
              <Image
                src={signed.signedUrl}
                alt={chantier.titre}
                width={800}
                height={600}
                className="h-44 w-full rounded-lg border object-cover transition group-hover:opacity-90"
              />
              <span className="mt-1 block text-center text-xs text-muted-foreground">
                🔍 Cliquer pour agrandir
              </span>
            </a>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg leading-snug">{chantier.titre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {chantier.adresse && <p>📍 {chantier.adresse}</p>}
              {(chantier.ville || chantier.code_postal) && (
                <p>{chantier.code_postal} {chantier.ville}</p>
              )}
              {chantier.permis_construire && <p>📄 PC {chantier.permis_construire}</p>}
              {chantier.montant_travaux_ht != null && (
                <p>💰 {chantier.montant_travaux_ht.toLocaleString("fr-FR")} € HT</p>
              )}
              {chantier.notes && (
                <p className="italic text-muted-foreground pt-2">📝 {chantier.notes}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : intervenants (avec tri Clients SALTI / inconnus) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Intervenants ({intervenantItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <IntervenantsList
              items={intervenantItems}
              chantierId={chantier.id}
              chantierTitre={chantier.titre}
              commercialNom={commercialNom}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
