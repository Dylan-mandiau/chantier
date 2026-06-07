"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Link2 } from "lucide-react";

export interface AdminChantierItem {
  id: string;
  titre: string;
  ville: string | null;
  parLabel: string;
  agenceLabel: string | null;
  dateLabel: string;
  dateIso: string;
  /** Lien durable du panneau : les fiches d'un même panneau (multi-agences)
   *  partagent ce panneauId et sont regroupées sur une ligne. */
  panneauId: string | null;
}

interface Groupe {
  key: string;
  titre: string;
  ville: string | null;
  dateLabel: string;
  dateIso: string;
  membres: AdminChantierItem[];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function grouper(items: AdminChantierItem[]): Groupe[] {
  const map = new Map<string, AdminChantierItem[]>();
  for (const it of items) {
    const key = it.panneauId ? `pan:${it.panneauId}` : `solo:${it.id}`;
    const arr = map.get(key);
    if (arr) arr.push(it);
    else map.set(key, [it]);
  }
  const groupes = [...map.values()].map((membres) => {
    const tri = membres
      .slice()
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    return {
      key: tri[0].id,
      titre: tri[0].titre,
      ville: tri[0].ville,
      dateLabel: tri[0].dateLabel,
      dateIso: tri[0].dateIso,
      membres: tri,
    };
  });
  groupes.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  return groupes;
}

export function AdminChantiersList({ items }: { items: AdminChantierItem[] }) {
  const [q, setQ] = useState("");

  const groupes = useMemo(() => {
    const nq = normalize(q.trim());
    const filtered = nq
      ? items.filter((it) =>
          normalize(
            [it.titre, it.ville ?? "", it.parLabel, it.agenceLabel ?? ""].join(" ")
          ).includes(nq)
        )
      : items;
    return grouper(filtered);
  }, [items, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (chantier, ville, commercial, agence)…"
          className="pl-9"
        />
      </div>

      {groupes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun chantier ne correspond.
        </p>
      )}

      {groupes.slice(0, 100).map((g) =>
        g.membres.length === 1 ? (
          // Fiche unique
          <Link key={g.key} href={`/chantiers/${g.membres[0].id}`}>
            <div className="border rounded p-3 hover:bg-muted transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{g.membres[0].titre}</p>
                <p className="text-xs text-muted-foreground">
                  {g.membres[0].ville ? `📍 ${g.membres[0].ville} · ` : ""}
                  par {g.membres[0].parLabel}
                  {g.membres[0].agenceLabel ? ` (${g.membres[0].agenceLabel})` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {g.membres[0].dateLabel}
              </span>
            </div>
          </Link>
        ) : (
          // Même panneau partagé entre plusieurs agences -> regroupé
          <div key={g.key} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate flex items-center gap-2">
                {g.ville ? `📍 ${g.ville} · ` : ""}
                {g.titre}
              </p>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                <Link2 className="size-3 mr-1" />
                {g.membres.length} agences
              </Badge>
            </div>
            <div className="space-y-1">
              {g.membres.map((m) => (
                <Link key={m.id} href={`/chantiers/${m.id}`}>
                  <div className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-muted transition-colors">
                    <span className="truncate text-muted-foreground">
                      par {m.parLabel}
                      {m.agenceLabel ? ` (${m.agenceLabel})` : ""}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {m.dateLabel}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
