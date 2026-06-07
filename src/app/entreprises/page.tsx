import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeStatutCommercial,
  type StatutInputs,
} from "@/lib/statut/compute";
import {
  EntreprisesListClient,
  type EntrepriseItem,
} from "./EntreprisesListClient";

// Jointure : un intervenant -> son entreprise + le chantier parent
type Row = {
  chantier_id: string;
  entreprise: {
    id: string;
    raison_sociale: string;
    ville: string | null;
    code_postal: string | null;
    telephone: string | null;
    email: string | null;
    code_client_salti: string | null;
  } | null;
};

export default async function EntreprisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tous les intervenants visibles par l'utilisateur (RLS : ses chantiers,
  // ou ceux de son équipe s'il est manager/admin)
  const { data: rows } = await supabase
    .from("chantier_intervenants")
    .select(
      `chantier_id,
       entreprise:entreprises(id, raison_sociale, ville, code_postal, telephone, email, code_client_salti)`
    )
    .returns<Row[]>();

  // Agrège par entreprise : nb de chantiers distincts
  const byEnt = new Map<
    string,
    { entreprise: NonNullable<Row["entreprise"]>; chantierIds: Set<string> }
  >();
  (rows ?? []).forEach((r) => {
    if (!r.entreprise) return;
    const existing = byEnt.get(r.entreprise.id);
    if (existing) existing.chantierIds.add(r.chantier_id);
    else
      byEnt.set(r.entreprise.id, {
        entreprise: r.entreprise,
        chantierIds: new Set([r.chantier_id]),
      });
  });

  const entIds = [...byEnt.keys()];
  const safeIds =
    entIds.length > 0 ? entIds : ["00000000-0000-0000-0000-000000000000"];

  // Statut commercial : contacts + relances sur ces entreprises
  const today = new Date().toISOString().slice(0, 10);
  const [contactsRes, relancesRes, suiviRes] = await Promise.all([
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
      .gte("date_relance", today)
      .order("date_relance", { ascending: true }),
    // Statuts de suivi manuel (#44) par entreprise, pour le filtre Suivi.
    supabase
      .from("intervenant_suivi")
      .select("entreprise_id, statut")
      .in("entreprise_id", safeIds),
  ]);

  const suiviByEnt = new Map<string, Set<string>>();
  (suiviRes.data ?? []).forEach((s) => {
    const set = suiviByEnt.get(s.entreprise_id) ?? new Set<string>();
    set.add(s.statut);
    suiviByEnt.set(s.entreprise_id, set);
  });

  const lastContact = new Map<string, NonNullable<StatutInputs["dernierContact"]>>();
  (contactsRes.data ?? []).forEach((c) => {
    if (!lastContact.has(c.entreprise_id)) {
      lastContact.set(c.entreprise_id, { statut: c.statut, envoye_at: c.envoye_at });
    }
  });
  const nextRelance = new Map<string, NonNullable<StatutInputs["prochaineRelance"]>>();
  (relancesRes.data ?? []).forEach((r) => {
    if (!nextRelance.has(r.entreprise_id)) {
      nextRelance.set(r.entreprise_id, { date_relance: r.date_relance, motif: r.motif });
    }
  });

  const items: EntrepriseItem[] = [...byEnt.values()].map((v) => ({
    id: v.entreprise.id,
    raison_sociale: v.entreprise.raison_sociale,
    ville: v.entreprise.ville,
    code_postal: v.entreprise.code_postal,
    telephone: v.entreprise.telephone,
    email: v.entreprise.email,
    code_client_salti: v.entreprise.code_client_salti,
    nbChantiers: v.chantierIds.size,
    statut: computeStatutCommercial({
      codeClientSalti: v.entreprise.code_client_salti,
      dernierContact: lastContact.get(v.entreprise.id) ?? null,
      prochaineRelance: nextRelance.get(v.entreprise.id) ?? null,
      today,
    }),
    suiviStatuts: [...(suiviByEnt.get(v.entreprise.id) ?? [])],
  }));

  return <EntreprisesListClient items={items} />;
}
