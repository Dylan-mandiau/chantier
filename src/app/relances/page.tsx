import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RelanceCard, type RelanceData } from "@/components/relance-card";

export default async function RelancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("relances")
    .select(
      `id, date_relance, motif, status, chantier_id,
       entreprise:entreprises(id, raison_sociale, telephone, email, ville)`
    )
    .eq("status", "planifiee")
    .order("date_relance", { ascending: true })
    .returns<RelanceData[]>();

  const relances = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const inAWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const aujourdhui = relances.filter((r) => r.date_relance <= today);
  const cetteSemaine = relances.filter(
    (r) => r.date_relance > today && r.date_relance <= inAWeek
  );
  const aVenir = relances.filter((r) => r.date_relance > inAWeek);

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Mes relances</h1>
        <div className="w-20" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-red-700">
          🔴 À faire aujourd&apos;hui ({aujourdhui.length})
        </h2>
        {aujourdhui.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune relance aujourd&apos;hui 🎉
          </p>
        )}
        {aujourdhui.map((r) => (
          <RelanceCard key={r.id} relance={r} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-amber-700">
          🟡 Cette semaine ({cetteSemaine.length})
        </h2>
        {cetteSemaine.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune relance prévue cette semaine.
          </p>
        )}
        {cetteSemaine.map((r) => (
          <RelanceCard key={r.id} relance={r} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted-foreground">
          ⚪ À venir ({aVenir.length})
        </h2>
        {aVenir.map((r) => (
          <RelanceCard key={r.id} relance={r} />
        ))}
      </section>
    </main>
  );
}
