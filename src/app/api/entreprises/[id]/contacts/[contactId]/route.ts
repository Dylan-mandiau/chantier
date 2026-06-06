// src/app/api/entreprises/[id]/contacts/[contactId]/route.ts
// Modification (avec diff de traçabilité) et suppression d'un contact.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
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

const FIELDS = [
  "prenom",
  "nom",
  "fonction",
  "telephone",
  "telephone_portable",
  "email",
  "compte_extranet",
  "notes",
] as const;

const clean = (v: unknown) =>
  typeof v === "string" ? (v.trim() ? v.trim() : null) : v ?? null;

const label = (prenom: unknown, nom: unknown) =>
  [prenom, nom].filter(Boolean).join(" ").trim() || "Contact";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: entrepriseId, contactId } = await params;
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
  const { data: before } = await admin
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();
  if (!before) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  // Diff des champs fournis -> changements + payload d'update.
  const update: Record<string, unknown> = {};
  const changements: Record<string, { avant: unknown; apres: unknown }> = {};
  for (const f of FIELDS) {
    if (!(f in parsed.data)) continue;
    const next =
      f === "compte_extranet"
        ? Boolean((parsed.data as Record<string, unknown>)[f])
        : clean((parsed.data as Record<string, unknown>)[f]);
    const prev = (before as Record<string, unknown>)[f] ?? (f === "compte_extranet" ? false : null);
    if (next !== prev) {
      update[f] = next;
      changements[f] = { avant: prev, apres: next };
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error } = await supabase
    .from("contacts")
    .update(update as Database["public"]["Tables"]["contacts"]["Update"])
    .eq("id", contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("contact_modifications").insert({
    contact_id: contactId,
    entreprise_id: entrepriseId,
    agence_id: before.agence_id,
    modifie_par: user.id,
    contact_label: label(update.prenom ?? before.prenom, update.nom ?? before.nom),
    action: "modification",
    changements: JSON.parse(JSON.stringify(changements)),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: entrepriseId, contactId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("contacts")
    .select("prenom, nom, agence_id")
    .eq("id", contactId)
    .single();
  if (!before) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("contact_modifications").insert({
    contact_id: null,
    entreprise_id: entrepriseId,
    agence_id: before.agence_id,
    modifie_par: user.id,
    contact_label: label(before.prenom, before.nom),
    action: "suppression",
    changements: {},
  });

  return NextResponse.json({ ok: true });
}
