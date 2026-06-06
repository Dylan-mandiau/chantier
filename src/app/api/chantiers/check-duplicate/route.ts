// src/app/api/chantiers/check-duplicate/route.ts
// Détection PRÉCOCE d'un doublon : appelée par AnalyseClient juste après
// l'analyse (avant que l'utilisateur n'édite la fiche), pour le prévenir
// tout de suite si le panneau est déjà dans son agence. Pas d'écriture,
// juste un SELECT indexé (quelques ms, aucun appel IA).
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { detectChantierDuplicate } from "@/lib/dedup/chantier-detect";
import { z } from "zod";

const Schema = z.object({
  projet: z.object({
    permis_construire: z.string().nullable().optional(),
    titre: z.string().nullable().optional(),
    adresse: z.string().nullable().optional(),
    code_postal: z.string().nullable().optional(),
  }),
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
    return NextResponse.json({ duplicate: null });
  }

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("agence_id")
    .eq("id", user.id)
    .single();

  const duplicate = await detectChantierDuplicate(admin, {
    userId: user.id,
    agenceId: me?.agence_id ?? null,
    projet: {
      permis_construire: parsed.data.projet.permis_construire ?? null,
      titre: parsed.data.projet.titre ?? null,
      adresse: parsed.data.projet.adresse ?? null,
      code_postal: parsed.data.projet.code_postal ?? null,
    },
  });

  return NextResponse.json({ duplicate });
}
