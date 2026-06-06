// src/app/api/contacts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const PostSchema = z.object({
  entreprise_id: z.string().uuid(),
  intervenant_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  sujet: z.string().min(1),
  corps: z.string().min(1),
});

// POST — logger un premier contact envoyé via mailto
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
    .from("contacts_envoyes")
    .insert({
      entreprise_id: parsed.data.entreprise_id,
      intervenant_id: parsed.data.intervenant_id ?? null,
      template_id: parsed.data.template_id ?? null,
      envoye_par: user.id,
      sujet: parsed.data.sujet,
      corps: parsed.data.corps,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ contact_id: data.id });
}
