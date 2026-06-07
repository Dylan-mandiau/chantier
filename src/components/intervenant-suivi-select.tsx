"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUIVI_STATUTS, suiviConfig } from "@/lib/suivi/statuts";
import { toast } from "sonner";

/**
 * Sélecteur du statut de suivi MANUEL « où j'en suis » d'une entreprise sur un
 * chantier (#44). Sélection LIBRE (aucun ordre imposé). « Non défini » efface.
 */
export function IntervenantSuiviSelect({
  chantierId,
  entrepriseId,
  statut,
}: {
  chantierId: string;
  entrepriseId: string;
  statut: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(statut ?? "");
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch("/api/suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chantier_id: chantierId,
          entreprise_id: entrepriseId,
          statut: next || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success("Suivi mis à jour");
      router.refresh();
    } catch (e) {
      setValue(prev);
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const cfg = suiviConfig(value);

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0">Où j&apos;en suis :</span>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className={`rounded-full border px-2 py-1 text-xs font-medium ${
          cfg ? cfg.classes : "bg-background text-muted-foreground border-border"
        }`}
      >
        <option value="">Non défini</option>
        {SUIVI_STATUTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.emoji} {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
