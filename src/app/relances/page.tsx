import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { type RelanceData } from "@/components/relance-card";
import { RelancesAFaireClient } from "./RelancesAFaireClient";
import { RelancesHistoClient, type HistoRow } from "./RelancesHistoClient";

export default async function RelancesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isHisto = tab === "historique";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const baseSelect = `id, date_relance, motif, status, chantier_id, fait_at,
       entreprise:entreprises(id, raison_sociale, telephone, email, ville)`;

  let aFaire: RelanceData[] = [];
  let histo: HistoRow[] = [];

  if (!isHisto) {
    const { data } = await supabase
      .from("relances")
      .select(baseSelect)
      .eq("status", "planifiee")
      .order("date_relance", { ascending: true })
      .returns<RelanceData[]>();
    aFaire = data ?? [];
  } else {
    const { data } = await supabase
      .from("relances")
      .select(baseSelect)
      .neq("status", "planifiee")
      .order("fait_at", { ascending: false, nullsFirst: false })
      .order("date_relance", { ascending: false })
      .returns<HistoRow[]>();
    histo = data ?? [];
  }

  const tabCls = (active: boolean) =>
    `flex-1 text-center text-sm py-2 rounded-md border ${
      active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
    }`;

  return (
    <main className="container max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Mes relances</h1>
        <div className="w-20" />
      </div>

      <div className="flex gap-2">
        <Link href="/relances" className={tabCls(!isHisto)}>
          À faire
        </Link>
        <Link href="/relances?tab=historique" className={tabCls(isHisto)}>
          Historique
        </Link>
      </div>

      {!isHisto ? (
        <RelancesAFaireClient relances={aFaire} />
      ) : (
        <RelancesHistoClient rows={histo} />
      )}
    </main>
  );
}
