import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplatesClient, type Template } from "./TemplatesClient";

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") notFound();

  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .eq("actif", true)
    .order("type")
    .order("nom");

  return <TemplatesClient initialTemplates={(templates ?? []) as Template[]} />;
}
