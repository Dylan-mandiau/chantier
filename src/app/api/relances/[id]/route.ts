// src/app/api/relances/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { z } from "zod";

type RelanceUpdate = Database["public"]["Tables"]["relances"]["Update"];

const PatchSchema = z.object({
  status: z.enum(["planifiee", "faite", "reportee", "annulee"]).optional(),
  date_relance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  motif: z.string().min(1).max(500).optional(),
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

  const update: RelanceUpdate = { ...parsed.data };
  if (parsed.data.status === "faite") {
    update.fait_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("relances")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("relances").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
