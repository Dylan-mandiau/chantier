// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import type { Database } from "@/types/database";
import { z } from "zod";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const PatchSchema = z.object({
  role: z
    .enum(["commercial", "rc", "chef_secteur", "directeur_commercial", "admin"])
    .optional(),
  agence_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
});

// PATCH — modifier le rôle et/ou l'agence d'un utilisateur (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const update: ProfileUpdate = { ...parsed.data };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
