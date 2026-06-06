"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface AdminChantierItem {
  id: string;
  titre: string;
  ville: string | null;
  parLabel: string;
  agenceLabel: string | null;
  dateLabel: string;
  dateIso: string;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function AdminChantiersList({ items }: { items: AdminChantierItem[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    if (!nq) return items;
    return items.filter((it) =>
      normalize(
        [it.titre, it.ville ?? "", it.parLabel, it.agenceLabel ?? ""].join(" ")
      ).includes(nq)
    );
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

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun chantier ne correspond.
        </p>
      )}
      {filtered.slice(0, 100).map((c) => (
        <Link key={c.id} href={`/chantiers/${c.id}`}>
          <div className="border rounded p-3 hover:bg-muted transition-colors flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{c.titre}</p>
              <p className="text-xs text-muted-foreground">
                {c.ville ? `📍 ${c.ville} · ` : ""}
                par {c.parLabel}
                {c.agenceLabel ? ` (${c.agenceLabel})` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {c.dateLabel}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
