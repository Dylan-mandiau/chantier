"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { KpiData } from "@/lib/kpi/compute";

export interface KpiObjectifs {
  actif: boolean;
  objectif_scans: number | null;
  objectif_conversion_pct: number | null;
  objectif_adoption_pct: number | null;
}

const PERIODES = [
  { j: 7, label: "7 j" },
  { j: 30, label: "30 j" },
  { j: 90, label: "Trimestre" },
];

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
  status = null,
}: {
  emoji: string;
  value: string;
  label: string;
  sub?: string;
  highlight?: boolean;
  status?: "ok" | "ko" | null;
}) {
  const cls =
    status === "ok"
      ? "border-green-400 bg-green-50"
      : status === "ko"
        ? "border-red-300 bg-red-50"
        : highlight
          ? "border-amber-300 bg-amber-50"
          : "bg-card";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="text-xl leading-none">{emoji}</div>
      <div className="mt-1 text-2xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function ObjectifsPanel({ objectifs }: { objectifs: KpiObjectifs | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actif, setActif] = useState(objectifs?.actif ?? false);
  const [scans, setScans] = useState(objectifs?.objectif_scans?.toString() ?? "");
  const [conv, setConv] = useState(objectifs?.objectif_conversion_pct?.toString() ?? "");
  const [adopt, setAdopt] = useState(objectifs?.objectif_adoption_pct?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const toNum = (s: string) => (s.trim() === "" ? null : parseInt(s, 10));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/kpi-objectifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actif,
          objectif_scans: toNum(scans),
          objectif_conversion_pct: toNum(conv),
          objectif_adoption_pct: toNum(adopt),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success("Objectifs enregistrés");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <CardTitle className="text-base">
            🎯 Objectifs{" "}
            <span className={`text-xs font-normal ${actif ? "text-green-700" : "text-muted-foreground"}`}>
              {actif ? "(actifs)" : "(désactivés)"}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{open ? "Masquer" : "Configurer"}</span>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
            Colorer les KPIs selon les objectifs (vert atteint / rouge en-dessous)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Scans (période)</label>
              <Input type="number" value={scans} onChange={(e) => setScans(e.target.value)} placeholder="ex : 50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Conversion %</label>
              <Input type="number" value={conv} onChange={(e) => setConv(e.target.value)} placeholder="ex : 20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Adoption %</label>
              <Input type="number" value={adopt} onChange={(e) => setAdopt(e.target.value)} placeholder="ex : 80" />
            </div>
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "..." : "Enregistrer"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function KpiDashboard({
  data,
  periode,
  objectifs,
}: {
  data: KpiData;
  periode: number;
  objectifs: KpiObjectifs | null;
}) {
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const delta = data.scans.deltaPct;
  const objActif = objectifs?.actif ?? false;
  const statusFor = (val: number, target: number | null | undefined): "ok" | "ko" | null =>
    objActif && target != null ? (val >= target ? "ok" : "ko") : null;
  const funnelMax = data.funnel[0]?.count || 1;

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

      <ObjectifsPanel objectifs={objectifs} />

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          emoji="📸"
          value={String(data.scans.total)}
          label="scans"
          sub={delta === null ? "—" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs préc.`}
          status={statusFor(data.scans.total, objectifs?.objectif_scans)}
        />
        <Kpi
          emoji="🎯"
          value={data.conversion.tauxPct === null ? "—" : `${data.conversion.tauxPct}%`}
          label="conversion"
          sub={`${data.conversion.gagne} gagné(s)`}
          status={statusFor(data.conversion.tauxPct ?? 0, objectifs?.objectif_conversion_pct)}
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
            value={data.utilisation.adoptionPct === null ? "—" : `${data.utilisation.adoptionPct}%`}
            label="taux d'adoption"
            status={statusFor(data.utilisation.adoptionPct ?? 0, objectifs?.objectif_adoption_pct)}
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
        {/* Funnel de conversion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funnel de conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            {data.funnel.map((f) => {
              const w = Math.max(2, Math.round((f.count / funnelMax) * 100));
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">{f.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

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
              <BarChart layout="vertical" data={data.pipeline} margin={{ left: 24, right: 8, top: 4 }}>
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
