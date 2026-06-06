// src/app/api/templates/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import { z } from "zod";

const PostSchema = z.object({
  nom: z.string().min(1),
  sujet: z.string().min(1),
  corps: z.string().min(1),
  type: z.enum(["premier_contact", "relance", "rdv"]),
});

// GET — tous les templates actifs (lecture pour tous les users auth)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("actif", true)
    .order("type")
    .order("nom");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data ?? [] });
}

// POST — créer un template (admin only)
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ ...parsed.data, created_by: auth.userId, actif: true })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ template_id: data.id });
}
