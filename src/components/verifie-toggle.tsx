"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * Bascule « vérifié par un humain » sur une entreprise (#38). Affiché en badge
 * cliquable sur les lignes intervenants et la fiche entreprise. `label` = qui /
 * quand (affiché quand vérifié).
 */
export function VerifieToggle({
  entrepriseId,
  verifie,
  label,
}: {
  entrepriseId: string;
  verifie: boolean;
  label?: string | null;
}) {
  const router = useRouter();
  const [v, setV] = useState(verifie);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !v;
    setV(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/entreprises/${entrepriseId}/verifie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifie: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success(next ? "Marqué vérifié" : "Vérification retirée");
      router.refresh();
    } catch (e) {
      setV(!next);
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={v && label ? `Vérifié par ${label}` : "Marquer comme vérifié par un humain"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
        v
          ? "bg-green-100 text-green-800 border-green-300"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      <BadgeCheck className="size-3.5" />
      {v ? "Vérifié" : "À vérifier"}
    </button>
  );
}
