// src/app/api/entreprises/[id]/verifie/route.ts
// #38 : (dé)marque une entreprise comme « vérifiée par un humain » (coordonnées
// lues par l'IA confirmées). Donnée globale, qualité collaborative : tout
// utilisateur connecté peut la poser. Écrit via service role + horodatage/auteur.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({ verifie: z.boolean() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("entreprises")
    .update({
      verifie: parsed.data.verifie,
      verifie_par: parsed.data.verifie ? user.id : null,
      verifie_at: parsed.data.verifie ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, verifie: parsed.data.verifie });
}
