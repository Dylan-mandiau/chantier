"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";

interface Props {
  agences: { id: string; nom: string }[];
  commerciaux: { id: string; label: string }[];
}

export function AdminFilters({ agences, commerciaux }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin?${params.toString()}`);
  }

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Agence</Label>
        <select
          className={selectCls}
          value={sp.get("agence") ?? ""}
          onChange={(e) => setParam("agence", e.target.value)}
        >
          <option value="">Toutes les agences</option>
          {agences.map((a) => (
            <option key={a.id} value={a.id}>{a.nom}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Commercial</Label>
        <select
          className={selectCls}
          value={sp.get("commercial") ?? ""}
          onChange={(e) => setParam("commercial", e.target.value)}
        >
          <option value="">Tous les commerciaux</option>
          {commerciaux.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Période</Label>
        <select
          className={selectCls}
          value={sp.get("days") ?? "30"}
          onChange={(e) => setParam("days", e.target.value)}
        >
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
          <option value="3650">Tout l&apos;historique</option>
        </select>
      </div>
    </div>
  );
}
