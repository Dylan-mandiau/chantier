import { redirect, notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { UsersClient, type UserRow, type AgenceRow } from "./UsersClient";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") notFound();

  const admin = createAdminClient();
  const [{ data: users }, { data: agences }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, nom, prenom, role, agence_id, manager_id")
      .order("email"),
    admin.from("agences").select("id, nom, ville").order("nom"),
  ]);

  return (
    <UsersClient
      initialUsers={(users ?? []) as UserRow[]}
      initialAgences={(agences ?? []) as AgenceRow[]}
    />
  );
}
