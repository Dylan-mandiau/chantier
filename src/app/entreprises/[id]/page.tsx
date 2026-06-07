import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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

type PersonneRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  fonction: string | null;
  telephone: string | null;
  telephone_portable: string | null;
  email: string | null;
  compte_extranet: boolean;
  notes: string | null;
  created_by: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  contact_label: string | null;
  changements: Record<string, { avant: unknown; apres: unknown }> | null;
  modifie_at: string;
  modifie_par: string | null;
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

  const [interventionsRes, relancesRes, contactsRes, personnesRes, auditRes, suiviRes] =
    await Promise.all([
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
      // Contacts (personnes) — RLS niveau agence
      supabase
        .from("contacts")
        .select(
          "id, prenom, nom, fonction, telephone, telephone_portable, email, compte_extranet, notes, created_by"
        )
        .eq("entreprise_id", id)
        .order("created_at", { ascending: true })
        .returns<PersonneRow[]>(),
      // Traçabilité contacts (50 derniers événements)
      supabase
        .from("contact_modifications")
        .select(
          "id, action, contact_label, changements, modifie_at, modifie_par"
        )
        .eq("entreprise_id", id)
        .order("modifie_at", { ascending: false })
        .limit(50)
        .returns<AuditRow[]>(),
      // Statut de suivi manuel par chantier pour cette entreprise (#44)
      supabase
        .from("intervenant_suivi")
        .select("chantier_id, statut")
        .eq("entreprise_id", id),
    ]);

  const suiviByChantier = new Map<string, string>();
  (suiviRes.data ?? []).forEach((s) => suiviByChantier.set(s.chantier_id, s.statut));

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
    { id: string; titre: string; ville: string | null; lots: string[]; statutSuivi: string | null }
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
        statutSuivi: suiviByChantier.get(iv.chantier.id) ?? null,
      });
    }
  });

  // Résolution des noms d'auteurs : profiles RLS = self-only, donc admin client.
  const personnesRows = personnesRes.data ?? [];
  const auditRows = auditRes.data ?? [];
  const authorIds = [
    ...new Set(
      [
        ...personnesRows.map((p) => p.created_by),
        ...auditRows.map((a) => a.modifie_par),
      ].filter((x): x is string => !!x)
    ),
  ];
  const authorMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const admin = createAdminClient();
    const { data: authors } = await admin
      .from("profiles")
      .select("id, prenom, nom, email")
      .in("id", authorIds);
    (authors ?? []).forEach((a) => {
      const nom = [a.prenom, a.nom].filter(Boolean).join(" ").trim();
      authorMap.set(a.id, nom || a.email || "Inconnu");
    });
  }

  const personnes = personnesRows.map((p) => ({
    id: p.id,
    prenom: p.prenom,
    nom: p.nom,
    fonction: p.fonction,
    telephone: p.telephone,
    telephone_portable: p.telephone_portable,
    email: p.email,
    compte_extranet: p.compte_extranet,
    notes: p.notes,
    auteur: p.created_by ? authorMap.get(p.created_by) ?? null : null,
  }));

  const personnesAudit = auditRows.map((a) => ({
    id: a.id,
    action: a.action,
    contact_label: a.contact_label,
    changements: a.changements,
    modifie_at: a.modifie_at,
    auteur: a.modifie_par ? authorMap.get(a.modifie_par) ?? null : null,
  }));

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
    personnes,
    personnesAudit,
  };

  return <EntrepriseClient detail={detail} />;
}
