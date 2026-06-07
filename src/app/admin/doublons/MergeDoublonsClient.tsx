"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export interface DupFiche {
  id: string;
  titre: string;
  ville: string | null;
  parLabel: string;
  dateLabel: string;
  dateIso: string;
}

export interface DupGroup {
  key: string;
  titre: string;
  agenceLabel: string | null;
  fiches: DupFiche[];
}

export function MergeDoublonsClient({ groups }: { groups: DupGroup[] }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {groups.length} doublon{groups.length > 1 ? "s" : ""} détecté
        {groups.length > 1 ? "s" : ""}
      </p>
      {groups.map((g) => (
        <GroupCard key={g.key} group={g} onMerged={() => router.refresh()} />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  onMerged,
}: {
  group: DupGroup;
  onMerged: () => void;
}) {
  // Par défaut on garde la plus ancienne (fiches triées par date croissante).
  const [keeperId, setKeeperId] = useState(group.fiches[0].id);
  const [merging, setMerging] = useState(false);

  async function merge() {
    const losers = group.fiches.filter((f) => f.id !== keeperId);
    if (
      !confirm(
        `Fusionner ${group.fiches.length} fiches en 1 ?\n\nLa fiche gardée reçoit tous les intervenants, relances, suivis et l'historique. Les ${losers.length} autre(s) seront SUPPRIMÉES.\n\nAction irréversible.`
      )
    )
      return;
    setMerging(true);
    try {
      for (const l of losers) {
        const res = await fetch("/api/admin/chantiers/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keeper_id: keeperId, loser_id: l.id }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      }
      toast.success("Doublons fusionnés");
      onMerged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setMerging(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {group.titre}
          {group.agenceLabel && (
            <span className="font-normal text-muted-foreground"> · {group.agenceLabel}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Choisis la fiche à GARDER :</p>
        {group.fiches.map((f) => (
          <label
            key={f.id}
            className={`flex items-center gap-2 border rounded p-2 cursor-pointer ${
              keeperId === f.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <input
              type="radio"
              name={`keeper-${group.key}`}
              checked={keeperId === f.id}
              onChange={() => setKeeperId(f.id)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{f.titre}</p>
              <p className="text-xs text-muted-foreground">
                {f.ville ? `📍 ${f.ville} · ` : ""}par {f.parLabel} · {f.dateLabel}
              </p>
            </div>
            <Link
              href={`/chantiers/${f.id}`}
              target="_blank"
              className="shrink-0 text-xs underline text-muted-foreground"
            >
              voir
            </Link>
          </label>
        ))}
        <Button onClick={merge} disabled={merging} variant="destructive" size="sm">
          {merging ? "Fusion…" : `Fusionner (${group.fiches.length} → 1)`}
        </Button>
      </CardContent>
    </Card>
  );
}
