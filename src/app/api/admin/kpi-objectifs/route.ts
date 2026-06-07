// src/app/api/admin/kpi-objectifs/route.ts
// #51 P2 : enregistre les objectifs KPI (singleton). Réservé admin.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import { z } from "zod";

const Schema = z.object({
  actif: z.boolean(),
  objectif_scans: z.number().int().min(0).max(100000).nullable(),
  objectif_conversion_pct: z.number().int().min(0).max(100).nullable(),
  objectif_adoption_pct: z.number().int().min(0).max(100).nullable(),
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

  const admin = createAdminClient();
  const { error } = await admin.from("kpi_objectifs").upsert({
    id: true,
    actif: parsed.data.actif,
    objectif_scans: parsed.data.objectif_scans,
    objectif_conversion_pct: parsed.data.objectif_conversion_pct,
    objectif_adoption_pct: parsed.data.objectif_adoption_pct,
    updated_by: auth.userId,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
