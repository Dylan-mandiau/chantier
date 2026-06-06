// src/app/api/admin/agences/[id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import type { Database } from "@/types/database";
import { z } from "zod";

type AgenceUpdate = Database["public"]["Tables"]["agences"]["Update"];

const PatchSchema = z.object({
  nom: z.string().min(1).max(120).optional(),
  ville: z.string().max(120).nullable().optional(),
  code: z.string().max(10).nullable().optional(),
});

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

  const update: AgenceUpdate = {
    ...parsed.data,
    ...(parsed.data.code !== undefined
      ? {
          code: parsed.data.code?.trim()
            ? parsed.data.code.trim().toUpperCase()
            : null,
        }
      : {}),
  };

  const admin = createAdminClient();
  const { error } = await admin.from("agences").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Détache les profils de cette agence avant suppression
  await admin.from("profiles").update({ agence_id: null }).eq("agence_id", id);

  const { error } = await admin.from("agences").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
