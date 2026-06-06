// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import { z } from "zod";

const PostSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  nom: z.string().max(120).nullable().optional(),
  prenom: z.string().max(120).nullable().optional(),
  role: z
    .enum(["commercial", "rc", "chef_secteur", "directeur_commercial", "admin"])
    .default("commercial"),
  agence_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
});

/**
 * POST — admin only.
 * Crée un utilisateur complet :
 *   1. supabase.auth.admin.createUser (auth.users) avec email_confirm: true
 *      pour qu'il puisse se connecter directement (pas de mail de validation).
 *   2. Le trigger `handle_new_user` crée automatiquement une ligne profiles
 *      avec id + email. On UPDATE ensuite pour nom/prenom/role/agence/manager.
 */
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

  const admin = createAdminClient();

  // 1. Création du user auth (email confirmé d'office)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Création échouée" },
      { status: 500 }
    );
  }

  const newId = created.user.id;

  // 2. Update du profile (le trigger handle_new_user a déjà créé la ligne avec
  //    id + email). On définit nom/prenom/role/agence/manager.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      nom: parsed.data.nom?.trim() ? parsed.data.nom.trim() : null,
      prenom: parsed.data.prenom?.trim() ? parsed.data.prenom.trim() : null,
      role: parsed.data.role,
      agence_id: parsed.data.agence_id ?? null,
      manager_id: parsed.data.manager_id ?? null,
    })
    .eq("id", newId);

  if (updateErr) {
    // Rollback : on supprime l'utilisateur auth si l'update profile échoue
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ user_id: newId });
}
