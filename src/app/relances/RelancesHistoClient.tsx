"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export interface HistoRow {
  id: string;
  date_relance: string;
  motif: string;
  status: string;
  chantier_id: string | null;
  fait_at: string | null;
  entreprise: { raison_sociale: string; ville: string | null } | null;
}

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  faite: { label: "✅ Faite", cls: "bg-green-100 text-green-800 border-green-300" },
  reportee: { label: "📅 Reportée", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  annulee: { label: "✖ Annulée", cls: "bg-gray-100 text-gray-600 border-gray-300" },
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function RelancesHistoClient({ rows }: { rows: HistoRow[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    return rows.filter((r) => {
      if (statut && r.status !== statut) return false;
      if (nq) {
        const hay = normalize(
          [r.entreprise?.raison_sociale ?? "", r.motif, r.entreprise?.ville ?? ""].join(" ")
        );
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [rows, q, statut]);

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <>
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (entreprise, motif, ville)…"
              className="pl-9"
            />
          </div>
          <select
            className={selectCls}
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="faite">✅ Faites</option>
            <option value="reportee">📅 Reportées</option>
            <option value="annulee">✖ Annulées</option>
          </select>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted-foreground">
          Historique ({filtered.length})
        </h2>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune relance ne correspond.
          </p>
        )}
        {filtered.map((r) => {
          const st = STATUT_LABEL[r.status] ?? { label: r.status, cls: "" };
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
    </>
  );
}
