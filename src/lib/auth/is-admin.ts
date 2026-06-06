// src/lib/auth/is-admin.ts
import { createClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

/**
 * Vérifie que l'utilisateur connecté a le rôle 'admin'.
 * Renvoie un objet discriminé pour gérer 401 (pas auth) et 403 (pas admin).
 *
 * Usage typique dans une Route Handler :
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Réservé aux admins" };
  }
  return { ok: true, userId: user.id };
}
