// src/app/api/chantiers/import/route.ts
// Import inter-agence : crée une fiche dans MON agence à partir d'une fiche
// existante d'une autre agence (mêmes données vérifiées). On garde sa propre
// photo fraîchement scannée ; on copie projet + intervenants (qui pointent
// vers les mêmes entreprises GLOBALES) ; on lie au même panneau (panneau_id).
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  source_chantier_id: z.string().uuid(),
  photo_path: z.string().min(1),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("agence_id")
    .eq("id", user.id)
    .single();
  const agenceId = me?.agence_id ?? null;

  // Fiche source (service role : elle peut être dans une autre agence).
  const { data: src } = await admin
    .from("chantiers")
    .select(
      "id, titre, adresse, ville, code_postal, permis_construire, date_pc, montant_travaux_ht, dedup_key, panneau_id, ia_raw_json"
    )
    .eq("id", parsed.data.source_chantier_id)
    .single();
  if (!src) {
    return NextResponse.json({ error: "Fiche source introuvable" }, { status: 404 });
  }

  // Si mon agence a DÉJÀ ce panneau, on n'en recrée pas : on renvoie l'existant.
  if (agenceId && src.dedup_key) {
    const { data: mine } = await admin
      .from("chantiers")
      .select("id")
      .eq("agence_id", agenceId)
      .eq("dedup_key", src.dedup_key)
      .limit(1)
      .maybeSingle();
    if (mine) {
      return NextResponse.json({ chantier_id: mine.id, already: true });
    }
  }

  // Création de MA fiche (client utilisateur -> RLS owner_insert ; created_by = moi).
  const { data: created, error: createErr } = await supabase
    .from("chantiers")
    .insert({
      titre: src.titre,
      adresse: src.adresse,
      ville: src.ville,
      code_postal: src.code_postal,
      latitude: parsed.data.lat ?? null,
      longitude: parsed.data.lng ?? null,
      permis_construire: src.permis_construire,
      date_pc: src.date_pc,
      montant_travaux_ht: src.montant_travaux_ht,
      photo_principale_url: parsed.data.photo_path, // MA photo
      notes: parsed.data.notes ?? null,
      created_by: user.id,
      agence_id: agenceId,
      dedup_key: src.dedup_key,
      panneau_id: src.panneau_id, // même panneau -> lien durable
      ia_raw_json: src.ia_raw_json,
    })
    .select("id")
    .single();
  if (createErr || !created) {
    return NextResponse.json(
      { error: createErr?.message ?? "Échec de l'import" },
      { status: 500 }
    );
  }

  // Copie des intervenants (service role) : mêmes entreprises globales.
  const { data: srcInts } = await admin
    .from("chantier_intervenants")
    .select("entreprise_id, role, lot_numero, lot_intitule, rang, source_info, ordre")
    .eq("chantier_id", src.id);

  if (srcInts && srcInts.length > 0) {
    const rows = srcInts.map((it) => ({
      chantier_id: created.id,
      entreprise_id: it.entreprise_id,
      role: it.role,
      lot_numero: it.lot_numero,
      lot_intitule: it.lot_intitule,
      rang: it.rang,
      source_info: it.source_info,
      ordre: it.ordre,
    }));
    const { error: intErr } = await admin
      .from("chantier_intervenants")
      .insert(rows);
    if (intErr) {
      console.error("[chantiers/import] copy intervenants:", intErr);
      // Non bloquant : la fiche existe, les intervenants pourront être réajoutés.
    }
  }

  return NextResponse.json({ chantier_id: created.id });
}
