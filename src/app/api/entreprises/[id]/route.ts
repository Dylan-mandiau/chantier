// src/app/api/entreprises/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { z } from "zod";

type EntrepriseUpdate = Database["public"]["Tables"]["entreprises"]["Update"];

// Les entreprises forment un registre PARTAGÉ (lisible par tous les commerciaux).
// L'édition améliore la donnée pour tout le monde, donc on autorise tout
// utilisateur authentifié à corriger les coordonnées. L'écriture passe par le
// client admin car il n'y a pas de policy RLS UPDATE sur `entreprises`.
const PatchSchema = z.object({
  telephone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  site_web: z.string().nullable().optional(),
  adresse: z.string().nullable().optional(),
  ville: z.string().nullable().optional(),
  code_postal: z.string().nullable().optional(),
  code_client_salti: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Normalise les chaînes vides en null
  const cleaned: EntrepriseUpdate = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [
      k,
      typeof v === "string" && v.trim() === "" ? null : v,
    ])
  );

  const admin = createAdminClient();
  const { error } = await admin
    .from("entreprises")
    .update(cleaned)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
