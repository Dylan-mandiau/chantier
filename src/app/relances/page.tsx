import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RelanceCard, type RelanceData } from "@/components/relance-card";

type HistoRow = RelanceData & { fait_at: string | null };

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  faite: { label: "✅ Faite", cls: "bg-green-100 text-green-800 border-green-300" },
  reportee: { label: "📅 Reportée", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  annulee: { label: "✖ Annulée", cls: "bg-gray-100 text-gray-600 border-gray-300" },
};

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

  let aujourdhui: RelanceData[] = [];
  let cetteSemaine: RelanceData[] = [];
  let aVenir: RelanceData[] = [];
  let histo: HistoRow[] = [];

  if (!isHisto) {
    const { data } = await supabase
      .from("relances")
      .select(baseSelect)
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
    aujourdhui = relances.filter((r) => r.date_relance <= today);
    cetteSemaine = relances.filter(
      (r) => r.date_relance > today && r.date_relance <= inAWeek
    );
    aVenir = relances.filter((r) => r.date_relance > inAWeek);
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
    <main className="container max-w-2xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Mes relances</h1>
        <div className="w-20" />
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <Link href="/relances" className={tabCls(!isHisto)}>
          À faire
        </Link>
        <Link href="/relances?tab=historique" className={tabCls(isHisto)}>
          Historique
        </Link>
      </div>

      {!isHisto ? (
        <>
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
        </>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">
            Historique ({histo.length})
          </h2>
          {histo.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune relance traitée pour l&apos;instant.
            </p>
          )}
          {histo.map((r) => {
            const st = STATUT_LABEL[r.status] ?? {
              label: r.status,
              cls: "",
            };
            const refDate = r.fait_at ?? r.date_relance;
            return (
              <Card key={r.id} className="opacity-90">
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">
                      {r.entreprise?.raison_sociale ?? "—"}
                    </p>
                    <Badge variant="outline" className={`text-xs ${st.cls}`}>
                      {st.label}
                    </Badge>
                  </div>
                  <p className="text-sm italic text-muted-foreground">
                    &quot;{r.motif}&quot;
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "short",
                      }).format(new Date(refDate))}
                    </span>
                    {r.chantier_id && (
                      <Link
                        href={`/chantiers/${r.chantier_id}`}
                        className="text-xs underline text-muted-foreground"
                      >
                        Voir le chantier →
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
