import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { computeKpis } from "@/lib/kpi/compute";
import { KpiDashboard } from "./KpiDashboard";

const PERIODES_OK = [7, 30, 90];

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
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
  if (profile?.role !== "admin") redirect("/");

  const periode = PERIODES_OK.includes(Number(periodeParam))
    ? Number(periodeParam)
    : 30;

  const admin = createAdminClient();
  const data = await computeKpis(admin, periode);

  return (
    <main className="container max-w-5xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Admin</Button>
        </Link>
        <h1 className="text-lg font-semibold">📊 KPI direction</h1>
        <div className="w-16" />
      </div>

      <KpiDashboard data={data} periode={periode} />
    </main>
  );
}
