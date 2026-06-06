// src/app/api/relances/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const PostSchema = z.object({
  entreprise_id: z.string().uuid(),
  date_relance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motif: z.string().min(1).max(500),
  chantier_id: z.string().uuid().nullable().optional(),
});

// GET — liste des relances du commercial connecté (RLS filtre auto)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("relances")
    .select(
      `id, date_relance, motif, status, chantier_id, created_at,
       entreprise:entreprises(id, raison_sociale, telephone, email, ville)`
    )
    .order("date_relance", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ relances: data ?? [] });
}

// POST — planifier une relance
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("relances")
    .insert({
      entreprise_id: parsed.data.entreprise_id,
      date_relance: parsed.data.date_relance,
      motif: parsed.data.motif,
      chantier_id: parsed.data.chantier_id ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ relance_id: data.id });
}
