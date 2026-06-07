"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit/activity";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) return { error: error.message };

  // Journal d'activité (#49) : trace la connexion.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logActivity(createAdminClient(), {
      userId: user.id,
      action: "connexion",
      entite: "auth",
      libelle: "Connexion",
    });
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// L'inscription publique est désactivée. Les comptes sont créés par l'admin
// dans /admin/users via /api/admin/users (qui utilise supabase.auth.admin
// avec le service_role). Cette action reste exportée pour ne pas casser
// l'historique git mais ne fait plus rien.
export async function signup(_formData: FormData) {
  return {
    error: "L'inscription publique est désactivée. Contacte ton administrateur SALTI.",
  };
}
