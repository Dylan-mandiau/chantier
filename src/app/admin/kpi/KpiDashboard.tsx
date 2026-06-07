"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiData } from "@/lib/kpi/compute";

const PERIODES = [
  { j: 7, label: "7 j" },
  { j: 30, label: "30 j" },
  { j: 90, label: "Trimestre" },
];

// Couleurs (hex) des statuts de suivi pour les graphes.
const STATUT_HEX: Record<string, string> = {
  a_contacter: "#9ca3af",
  contacte: "#3b82f6",
  relance_envoyee: "#eab308",
  rdv_pris: "#6366f1",
  devis_envoye: "#f59e0b",
  negociation: "#fb923c",
  gagne: "#16a34a",
  perdu: "#dc2626",
};

function Kpi({
  emoji,
  value,
  label,
  sub,
  highlight = false,
}: {
  emoji: string;
  value: string;
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-amber-300 bg-amber-50" : "bg-card"}`}>
      <div className="text-xl leading-none">{emoji}</div>
      <div className="mt-1 text-2xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

export function KpiDashboard({ data, periode }: { data: KpiData; periode: number }) {
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const delta = data.scans.deltaPct;

  return (
    <div className="space-y-4">
      {/* Sélecteur de période */}
      <div className="flex gap-2">
        {PERIODES.map((p) => (
          <Link
            key={p.j}
            href={`/admin/kpi?periode=${p.j}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              periode === p.j
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          emoji="📸"
          value={String(data.scans.total)}
          label="scans"
          sub={
            delta === null
              ? "—"
              : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs préc.`
          }
        />
        <Kpi
          emoji="🎯"
          value={data.conversion.tauxPct === null ? "—" : `${data.conversion.tauxPct}%`}
          label="conversion"
          sub={`${data.conversion.gagne} gagné(s)`}
        />
        <Kpi emoji="📧" value={String(data.contacts)} label="contacts envoyés" />
        <Kpi
          emoji="🔔"
          value={String(data.relances.enRetard)}
          label="relances en retard"
          sub={`${data.relances.aFaire} à faire`}
          highlight={data.relances.enRetard > 0}
        />
        <Kpi
          emoji="🏢"
          value={String(data.entreprises.total)}
          label="entreprises"
          sub={`${data.entreprises.clientsSalti} clients SALTI`}
        />
        <Kpi
          emoji="✅"
          value={`${pct(data.entreprises.verifiees, data.entreprises.total)}%`}
          label="vérifiées"
          sub={`${pct(data.entreprises.avecCoords, data.entreprises.total)}% avec coordonnées`}
        />
      </div>

      {/* Utilisation de l'outil */}
      <div>
        <p className="text-sm font-medium mb-2">⚙️ Utilisation de l&apos;outil</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi
            emoji="👥"
            value={`${data.utilisation.actifs}/${data.utilisation.totalUtilisateurs}`}
            label="utilisateurs actifs"
            sub="≥1 action sur la période"
          />
          <Kpi
            emoji="📈"
            value={
              data.utilisation.adoptionPct === null
                ? "—"
                : `${data.utilisation.adoptionPct}%`
            }
            label="taux d'adoption"
          />
          <Kpi
            emoji="⚡"
            value={String(data.utilisation.totalActions)}
            label="actions totales"
            sub="scans · contacts · suivis · éditions"
          />
          <Kpi
            emoji="🔁"
            value={
              data.utilisation.actionsParActif === null
                ? "—"
                : String(data.utilisation.actionsParActif)
            }
            label="actions / actif"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scans par jour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scans par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.scansParJour} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 10 }}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="scans" stroke="#caa800" fill="#ffdd00" fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline par statut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline (suivi)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={data.pipeline}
                margin={{ left: 24, right: 8, top: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="suivis">
                  {data.pipeline.map((p) => (
                    <Cell key={p.value} fill={STATUT_HEX[p.value] ?? "#9ca3af"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Classement agences */}
        {data.classementAgences.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scans par agence</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.classementAgences} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="nom" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="scans" name="scans" fill="#ffdd00" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Classement commerciaux */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top commerciaux</CardTitle>
          </CardHeader>
          <CardContent>
            {data.classementCommerciaux.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun scan sur la période.</p>
            ) : (
              <ol className="space-y-1.5">
                {data.classementCommerciaux.map((c, i) => (
                  <li key={c.nom + i} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                      {c.nom}
                    </span>
                    <span className="font-semibold tabular-nums">{c.scans}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
