"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RelanceCard, type RelanceData } from "@/components/relance-card";
import { Search } from "lucide-react";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function RelancesAFaireClient({ relances }: { relances: RelanceData[] }) {
  const [q, setQ] = useState("");

  const { aujourdhui, cetteSemaine, aVenir } = useMemo(() => {
    const nq = normalize(q.trim());
    const list = relances.filter((r) => {
      if (!nq) return true;
      const hay = normalize(
        [r.entreprise?.raison_sociale ?? "", r.motif, r.entreprise?.ville ?? ""].join(" ")
      );
      return hay.includes(nq);
    });
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const inAWeek = d.toISOString().slice(0, 10);
    return {
      aujourdhui: list.filter((r) => r.date_relance <= today),
      cetteSemaine: list.filter(
        (r) => r.date_relance > today && r.date_relance <= inAWeek
      ),
      aVenir: list.filter((r) => r.date_relance > inAWeek),
    };
  }, [relances, q]);

  return (
    <>
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (entreprise, motif, ville)…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-red-700">
          🔴 À faire aujourd&apos;hui ({aujourdhui.length})
        </h2>
        {aujourdhui.length === 0 && (
          <p className="text-sm text-muted-foreground">Rien à faire aujourd&apos;hui 🎉</p>
        )}
        {aujourdhui.map((r) => (
          <RelanceCard key={r.id} relance={r} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-amber-700">
          🟡 Cette semaine ({cetteSemaine.length})
        </h2>
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
  );
}
