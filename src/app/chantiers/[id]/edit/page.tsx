import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AnalyzedPanneau, AnalyzedIntervenant } from "@/lib/ai/schema";
import { EditClient } from "./EditClient";

// Type explicite pour la jointure Supabase (cf. fiche chantier — même pattern)
type IntervenantWithEntreprise = {
  role: string;
  lot_numero: string | null;
  lot_intitule: string | null;
  rang: number;
  ordre: number | null;
  source_info: { confiance_lecture?: number } | null;
  entreprise: {
    raison_sociale: string;
    telephone: string | null;
    email: string | null;
    ville: string | null;
    code_postal: string | null;
    adresse: string | null;
  } | null;
};

export default async function EditChantierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Charge le chantier
  const { data: chantier } = await supabase
    .from("chantiers")
    .select("*")
    .eq("id", id)
    .single();

  if (!chantier) notFound();

  // Charge les intervenants avec leur entreprise
  const { data: intervenants } = await supabase
    .from("chantier_intervenants")
    .select(
      `role, lot_numero, lot_intitule, rang, ordre, source_info,
       entreprise:entreprises(raison_sociale, telephone, email, ville, code_postal, adresse)`
    )
    .eq("chantier_id", id)
    .order("ordre", { ascending: true })
    .returns<IntervenantWithEntreprise[]>();

  // URL signée pour la preview photo
  const { data: signed } = await supabase.storage
    .from("chantier-photos")
    .createSignedUrl(chantier.photo_principale_url, 1800);

  // Reconstruit la structure AnalyzedPanneau attendue par le composant d'édition
  const initialData: AnalyzedPanneau = {
    projet: {
      titre: chantier.titre,
      adresse: chantier.adresse,
      ville: chantier.ville,
      code_postal: chantier.code_postal,
      permis_construire: chantier.permis_construire,
      date_pc: chantier.date_pc,
      montant_travaux_ht: chantier.montant_travaux_ht,
    },
    intervenants: (intervenants ?? [])
      .filter((it) => it.entreprise !== null)
      .map<AnalyzedIntervenant>((it) => ({
        role: it.role as AnalyzedIntervenant["role"],
        raison_sociale: it.entreprise!.raison_sociale,
        lot_numero: it.lot_numero,
        lot_intitule: it.lot_intitule,
        rang: (it.rang === 2 ? 2 : 1) as 1 | 2,
        adresse: it.entreprise!.adresse,
        ville: it.entreprise!.ville,
        code_postal: it.entreprise!.code_postal,
        telephone: it.entreprise!.telephone,
        email: it.entreprise!.email,
        confiance_lecture: it.source_info?.confiance_lecture ?? 1.0,
      })),
  };

  return (
    <EditClient
      chantierId={id}
      photoUrl={signed?.signedUrl ?? null}
      initialData={initialData}
      initialNotes={chantier.notes ?? ""}
    />
  );
}
