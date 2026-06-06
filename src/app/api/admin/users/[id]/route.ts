// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import type { Database } from "@/types/database";
import { z } from "zod";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const PatchSchema = z.object({
  // Champs profile
  role: z
    .enum(["commercial", "rc", "chef_secteur", "directeur_commercial", "admin"])
    .optional(),
  agence_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  nom: z.string().max(120).nullable().optional(),
  prenom: z.string().max(120).nullable().optional(),
  // Champ auth (séparé : changement de mot de passe par l'admin)
  password: z.string().min(8).max(128).optional(),
});

/**
 * PATCH — admin only.
 * Permet de modifier le profile (role, agence, manager, nom, prenom) et
 * éventuellement le mot de passe (auth.users via supabase.auth.admin).
 */
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

  const admin = createAdminClient();

  // 1. Mise à jour du mot de passe (si présent) via supabase.auth.admin
  if (parsed.data.password) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, {
      password: parsed.data.password,
    });
    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 500 });
    }
  }

  // 2. Mise à jour du profile (toutes les autres clés)
  const profileUpdate: ProfileUpdate = {};
  if (parsed.data.role !== undefined) profileUpdate.role = parsed.data.role;
  if (parsed.data.agence_id !== undefined)
    profileUpdate.agence_id = parsed.data.agence_id;
  if (parsed.data.manager_id !== undefined)
    profileUpdate.manager_id = parsed.data.manager_id;
  if (parsed.data.nom !== undefined)
    profileUpdate.nom = parsed.data.nom?.trim() ? parsed.data.nom.trim() : null;
  if (parsed.data.prenom !== undefined)
    profileUpdate.prenom = parsed.data.prenom?.trim()
      ? parsed.data.prenom.trim()
      : null;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE — admin only.
 * Supprime le user auth (supabase.auth.admin.deleteUser) ; le profile est
 * supprimé en cascade par la FK profiles.id -> auth.users.id (ON DELETE
 * CASCADE de la migration initiale).
 *
 * Garde-fou : un admin ne peut pas se supprimer lui-même.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas supprimer ton propre compte admin." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
