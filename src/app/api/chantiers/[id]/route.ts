import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AnalyzedPanneauSchema } from "@/lib/ai/schema";
import { normalizeRaisonSociale } from "@/lib/dedup/entreprise";
import { z } from "zod";

const PatchSchema = z.object({
  notes: z.string().nullable(),
  analyzed: AnalyzedPanneauSchema,
});

/**
 * PATCH /api/chantiers/[id]
 * Met à jour un chantier existant + remplace ses intervenants.
 *
 * Stratégie MVP : delete-then-insert sur les intervenants
 *   (simple, et la dédup entreprises évite les doublons)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { notes, analyzed } = parsed.data;

  // Vérifier que le chantier existe ET appartient à l'utilisateur (RLS le ferait, mais explicite)
  const { data: existing } = await supabase
    .from("chantiers")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();

  try {
    // 1. Update le chantier (RLS owner_update)
    const { error: updateErr } = await supabase
      .from("chantiers")
      .update({
        titre: analyzed.projet.titre,
        adresse: analyzed.projet.adresse,
        ville: analyzed.projet.ville,
        code_postal: analyzed.projet.code_postal,
        permis_construire: analyzed.projet.permis_construire,
        date_pc: analyzed.projet.date_pc,
        montant_travaux_ht: analyzed.projet.montant_travaux_ht,
        notes,
      })
      .eq("id", id);

    if (updateErr) {
      console.error("[chantiers PATCH] update chantier:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. Supprimer TOUS les intervenants existants pour ce chantier (admin pour passer RLS si délicat)
    const { error: delErr } = await admin
      .from("chantier_intervenants")
      .delete()
      .eq("chantier_id", id);

    if (delErr) {
      console.error("[chantiers PATCH] delete intervenants:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 3. Réinsérer les intervenants avec dédup entreprises (même logique que POST)
    for (let i = 0; i < analyzed.intervenants.length; i++) {
      const it = analyzed.intervenants[i];
      const normalisee = normalizeRaisonSociale(it.raison_sociale);

      let entrepriseId: string | null = null;

      const { data: existingEnt } = await admin
        .from("entreprises")
        .select("id")
        .eq("raison_sociale_normalisee", normalisee)
        .eq("code_postal", it.code_postal ?? "")
        .maybeSingle();

      if (existingEnt) {
        entrepriseId = existingEnt.id;
      } else {
        const { data: created, error: entrErr } = await admin
          .from("entreprises")
          .insert({
            raison_sociale: it.raison_sociale,
            raison_sociale_normalisee: normalisee,
            ville: it.ville,
            code_postal: it.code_postal ?? "",
            adresse: it.adresse,
            telephone: it.telephone,
            email: it.email,
            source_info: {
              ...(it.telephone ? { telephone: { src: "manuel", conf: 1.0 } } : {}),
              ...(it.email ? { email: { src: "manuel", conf: 1.0 } } : {}),
            },
          })
          .select("id")
          .single();
        if (entrErr || !created) {
          console.error("[chantiers PATCH] insert entreprise:", entrErr);
          continue;
        }
        entrepriseId = created.id;
      }

      await admin.from("chantier_intervenants").insert({
        chantier_id: id,
        entreprise_id: entrepriseId,
        role: it.role,
        lot_numero: it.lot_numero,
        lot_intitule: it.lot_intitule,
        rang: it.rang,
        source_info: { confiance_lecture: it.confiance_lecture },
        ordre: i,
      });
    }

    return NextResponse.json({ chantier_id: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[chantiers PATCH] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/chantiers/[id]
 * Supprime un chantier. La FK ON DELETE CASCADE supprime auto les intervenants.
 * La photo Storage est aussi supprimée si possible (best-effort).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Récupère le chemin photo avant de supprimer le chantier (pour cleanup Storage)
  const { data: chantier } = await supabase
    .from("chantiers")
    .select("photo_principale_url, created_by")
    .eq("id", id)
    .single();

  if (!chantier) {
    return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
  }

  // Delete : RLS chantiers_owner_delete + CASCADE auto sur chantier_intervenants
  const { error: delErr } = await supabase
    .from("chantiers")
    .delete()
    .eq("id", id);

  if (delErr) {
    console.error("[chantiers DELETE] error:", delErr);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort cleanup de la photo Storage (RLS users_delete_own_folder)
  if (chantier.photo_principale_url) {
    const { error: storageErr } = await supabase.storage
      .from("chantier-photos")
      .remove([chantier.photo_principale_url]);
    if (storageErr) {
      // Non bloquant : on a déjà supprimé en BDD, juste un orphelin Storage
      console.warn("[chantiers DELETE] storage cleanup failed:", storageErr);
    }
  }

  return NextResponse.json({ success: true });
}
