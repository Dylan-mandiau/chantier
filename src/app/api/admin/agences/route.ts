// src/app/api/admin/agences/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import { z } from "zod";

const PostSchema = z.object({
  nom: z.string().min(1).max(120),
  ville: z.string().max(120).nullable().optional(),
});

// POST — créer une agence (admin only)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agences")
    .insert({ nom: parsed.data.nom, ville: parsed.data.ville ?? null })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ agence_id: data.id });
}
