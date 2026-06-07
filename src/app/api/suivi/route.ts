// src/app/api/suivi/route.ts
// Pose / met à jour le statut de suivi MANUEL « où j'en suis » d'une entreprise
// (intervenant) sur un chantier (#44). Upsert par (chantier_id, entreprise_id),
// partagé au niveau agence (RLS). statut=null efface le suivi.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SUIVI_VALUES } from "@/lib/suivi/statuts";
import { logActivity } from "@/lib/audit/activity";
import { z } from "zod";

const Schema = z.object({
  chantier_id: z.string().uuid(),
  entreprise_id: z.string().uuid(),
  statut: z.enum(SUIVI_VALUES as [string, ...string[]]).nullable(),
  note: z.string().max(2000).nullable().optional(),
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
  const { chantier_id, entreprise_id, statut, note } = parsed.data;

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("agence_id")
    .eq("id", user.id)
    .single();
  const agenceId = me?.agence_id ?? null;

  // statut null -> on supprime le suivi (retour à "Non défini").
  if (statut === null) {
    const { error } = await supabase
      .from("intervenant_suivi")
      .delete()
      .eq("chantier_id", chantier_id)
      .eq("entreprise_id", entreprise_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, statut: null });
  }

  const { error } = await supabase.from("intervenant_suivi").upsert(
    {
      chantier_id,
      entreprise_id,
      agence_id: agenceId,
      statut,
      note: note ?? null,
      updated_by: user.id,
    },
    { onConflict: "chantier_id,entreprise_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(admin, {
    userId: user.id,
    agenceId,
    action: "suivi",
    entite: "entreprise",
    entiteId: entreprise_id,
    libelle: statut,
  });

  return NextResponse.json({ ok: true, statut });
}
