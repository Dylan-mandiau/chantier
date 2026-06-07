// src/app/api/admin/chantiers/merge/route.ts
// #36 : fusion de deux fiches chantier en DOUBLON (même panneau, même agence).
// Réservé admin. Déplace tout ce qui pointe vers la fiche "perdue" vers la
// fiche "gardée" (en dédoublonnant les conflits d'unicité), puis supprime la
// perdue. Service role : on agit au-delà de la RLS, donc on VALIDE strictement
// (même panneau + même agence) pour éviter une fusion accidentelle.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import { writeChantierAudit } from "@/lib/audit/chantier";
import { logActivity } from "@/lib/audit/activity";
import { z } from "zod";

const Schema = z.object({
  keeper_id: z.string().uuid(),
  loser_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { keeper_id, loser_id } = parsed.data;
  if (keeper_id === loser_id) {
    return NextResponse.json({ error: "Fiches identiques" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("chantiers")
    .select("id, titre, panneau_id, agence_id")
    .in("id", [keeper_id, loser_id]);
  const keeper = rows?.find((r) => r.id === keeper_id);
  const loser = rows?.find((r) => r.id === loser_id);
  if (!keeper || !loser) {
    return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
  }

  // Garde-fous : vrai doublon = même panneau ET même agence.
  if (!keeper.panneau_id || keeper.panneau_id !== loser.panneau_id) {
    return NextResponse.json(
      { error: "Ces fiches ne partagent pas le même panneau" },
      { status: 409 }
    );
  }
  if (!keeper.agence_id || keeper.agence_id !== loser.agence_id) {
    return NextResponse.json(
      { error: "Fusion inter-agences interdite (fiches volontairement distinctes)" },
      { status: 409 }
    );
  }

  // 1. intervenant_suivi (unique chantier+entreprise) : on garde la valeur de la
  //    fiche gardée, on supprime les suivis du perdu en conflit, on déplace le reste.
  const { data: keeperSuivi } = await admin
    .from("intervenant_suivi")
    .select("entreprise_id")
    .eq("chantier_id", keeper_id);
  const keeperSuiviEnt = new Set((keeperSuivi ?? []).map((s) => s.entreprise_id));
  const { data: loserSuivi } = await admin
    .from("intervenant_suivi")
    .select("id, entreprise_id")
    .eq("chantier_id", loser_id);
  for (const s of loserSuivi ?? []) {
    if (keeperSuiviEnt.has(s.entreprise_id)) {
      await admin.from("intervenant_suivi").delete().eq("id", s.id);
    } else {
      await admin
        .from("intervenant_suivi")
        .update({ chantier_id: keeper_id })
        .eq("id", s.id);
    }
  }

  // 2. chantier_intervenants : dédoublonne par (entreprise_id, role, lot_numero).
  const keyOf = (i: { entreprise_id: string | null; role: string; lot_numero: string | null }) =>
    `${i.entreprise_id ?? ""}|${i.role}|${i.lot_numero ?? ""}`;
  const { data: keeperInt } = await admin
    .from("chantier_intervenants")
    .select("entreprise_id, role, lot_numero")
    .eq("chantier_id", keeper_id);
  const keeperIntKeys = new Set((keeperInt ?? []).map(keyOf));
  const { data: loserInt } = await admin
    .from("chantier_intervenants")
    .select("id, entreprise_id, role, lot_numero")
    .eq("chantier_id", loser_id);
  for (const i of loserInt ?? []) {
    if (keeperIntKeys.has(keyOf(i))) {
      await admin.from("chantier_intervenants").delete().eq("id", i.id);
    } else {
      await admin
        .from("chantier_intervenants")
        .update({ chantier_id: keeper_id })
        .eq("id", i.id);
    }
  }

  // 3. relances + historique : on réaffecte simplement à la fiche gardée.
  await admin.from("relances").update({ chantier_id: keeper_id }).eq("chantier_id", loser_id);
  await admin
    .from("chantier_modifications")
    .update({ chantier_id: keeper_id })
    .eq("chantier_id", loser_id);

  // 4. Suppression de la fiche perdue.
  const { error: delErr } = await admin.from("chantiers").delete().eq("id", loser_id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 5. Traçabilité de la fusion sur la fiche gardée.
  await writeChantierAudit(admin, {
    chantierId: keeper_id,
    panneauId: keeper.panneau_id,
    agenceId: keeper.agence_id,
    modifiePar: auth.userId,
    titre: keeper.titre,
    action: "modification",
    changements: {
      fusion: { avant: loser.titre, apres: "doublon fusionné dans cette fiche" },
    },
  });
  await logActivity(admin, {
    userId: auth.userId,
    agenceId: keeper.agence_id,
    action: "fusion",
    entite: "chantier",
    entiteId: keeper_id,
    libelle: `Fusion : ${loser.titre}`,
  });

  return NextResponse.json({ ok: true });
}
