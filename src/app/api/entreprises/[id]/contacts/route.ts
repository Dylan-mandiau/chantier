// src/app/api/entreprises/[id]/contacts/route.ts
// Création d'un contact (personne) rattaché à une entreprise + audit.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  prenom: z.string().max(120).nullable().optional(),
  nom: z.string().max(120).nullable().optional(),
  fonction: z.string().max(160).nullable().optional(),
  telephone: z.string().max(40).nullable().optional(),
  telephone_portable: z.string().max(40).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  compte_extranet: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const clean = (v: string | null | undefined) =>
  typeof v === "string" && v.trim() ? v.trim() : null;

const label = (prenom: string | null, nom: string | null) =>
  [prenom, nom].filter(Boolean).join(" ").trim() || "Contact";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: entrepriseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("agence_id")
    .eq("id", user.id)
    .single();
  const agenceId = me?.agence_id ?? null;

  const prenom = clean(parsed.data.prenom);
  const nom = clean(parsed.data.nom);

  // Insert via client utilisateur -> RLS (agence) appliquée.
  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      entreprise_id: entrepriseId,
      agence_id: agenceId,
      created_by: user.id,
      prenom,
      nom,
      fonction: clean(parsed.data.fonction),
      telephone: clean(parsed.data.telephone),
      telephone_portable: clean(parsed.data.telephone_portable),
      email: clean(parsed.data.email),
      compte_extranet: parsed.data.compte_extranet ?? false,
      notes: clean(parsed.data.notes),
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Création échouée" },
      { status: 500 }
    );
  }

  // Traçabilité (service role) : action création.
  await admin.from("contact_modifications").insert({
    contact_id: created.id,
    entreprise_id: entrepriseId,
    agence_id: agenceId,
    modifie_par: user.id,
    contact_label: label(prenom, nom),
    action: "creation",
    changements: {},
  });

  return NextResponse.json({ id: created.id });
}
