import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeStatutCommercial,
  type StatutInputs,
} from "@/lib/statut/compute";
import { EntrepriseClient, type EntrepriseDetail } from "./EntrepriseClient";

// Intervenant -> chantier parent (RLS limite aux chantiers de l'utilisateur)
type InterventionRow = {
  role: string;
  lot_numero: string | null;
  lot_intitule: string | null;
  chantier: {
    id: string;
    titre: string;
    ville: string | null;
    code_postal: string | null;
    created_at: string;
  } | null;
};

type RelanceRow = {
  id: string;
  date_relance: string;
  motif: string;
  status: string;
};

type ContactRow = {
  id: string;
  envoye_at: string;
  sujet: string;
  statut: string;
};

export default async function EntrepriseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entreprise } = await supabase
    .from("entreprises")
    .select("*")
    .eq("id", id)
    .single();

  if (!entreprise) notFound();

  const [interventionsRes, relancesRes, contactsRes] = await Promise.all([
    supabase
      .from("chantier_intervenants")
      .select(
        `role, lot_numero, lot_intitule,
         chantier:chantiers(id, titre, ville, code_postal, created_at)`
      )
      .eq("entreprise_id", id)
      .returns<InterventionRow[]>(),
    supabase
      .from("relances")
      .select("id, date_relance, motif, status")
      .eq("entreprise_id", id)
      .order("date_relance", { ascending: true })
      .returns<RelanceRow[]>(),
    supabase
      .from("contacts_envoyes")
      .select("id, envoye_at, sujet, statut")
      .eq("entreprise_id", id)
      .order("envoye_at", { ascending: false })
      .returns<ContactRow[]>(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const dernierContact: StatutInputs["dernierContact"] =
    contactsRes.data && contactsRes.data.length > 0
      ? {
          statut: contactsRes.data[0].statut as NonNullable<
            StatutInputs["dernierContact"]
          >["statut"],
          envoye_at: contactsRes.data[0].envoye_at,
        }
      : null;
  const prochaineRelance =
    (relancesRes.data ?? []).find(
      (r) => r.status === "planifiee" && r.date_relance >= today
    ) ?? null;

  const statut = computeStatutCommercial({
    codeClientSalti: entreprise.code_client_salti,
    dernierContact,
    prochaineRelance: prochaineRelance
      ? { date_relance: prochaineRelance.date_relance, motif: prochaineRelance.motif }
      : null,
    today,
  });

  // Chantiers distincts (dédup par id)
  const chantiersMap = new Map<
    string,
    { id: string; titre: string; ville: string | null; lots: string[] }
  >();
  (interventionsRes.data ?? []).forEach((iv) => {
    if (!iv.chantier) return;
    const existing = chantiersMap.get(iv.chantier.id);
    const lotLabel = iv.lot_numero
      ? `Lot ${iv.lot_numero}${iv.lot_intitule ? ` (${iv.lot_intitule})` : ""}`
      : iv.role.replace(/_/g, " ");
    if (existing) {
      existing.lots.push(lotLabel);
    } else {
      chantiersMap.set(iv.chantier.id, {
        id: iv.chantier.id,
        titre: iv.chantier.titre,
        ville: iv.chantier.ville,
        lots: [lotLabel],
      });
    }
  });

  const detail: EntrepriseDetail = {
    id: entreprise.id,
    raison_sociale: entreprise.raison_sociale,
    siret: entreprise.siret,
    telephone: entreprise.telephone,
    email: entreprise.email,
    site_web: entreprise.site_web,
    adresse: entreprise.adresse,
    ville: entreprise.ville,
    code_postal: entreprise.code_postal,
    code_client_salti: entreprise.code_client_salti,
    statut,
    chantiers: [...chantiersMap.values()],
    relances: (relancesRes.data ?? []).filter((r) => r.status === "planifiee"),
    contacts: contactsRes.data ?? [],
  };

  return <EntrepriseClient detail={detail} />;
}
