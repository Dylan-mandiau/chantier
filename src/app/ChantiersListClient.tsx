"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChantierCard } from "@/components/chantier-card";
import { Plus, Search } from "lucide-react";

export interface ChantierItem {
  id: string;
  titre: string;
  ville: string | null;
  code_postal: string | null;
  photoUrl: string | null;
  nbIntervenants: number;
  createdAt: string;
  author: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ChantiersListClient({
  items,
  isAgence = false,
}: {
  items: ChantierItem[];
  isAgence?: boolean;
}) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [tri, setTri] = useState<"recent" | "entreprises" | "titre">("recent");

  const departements = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.code_postal && it.code_postal.length >= 2)
        set.add(it.code_postal.slice(0, 2));
    });
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    const out = items.filter((it) => {
      if (nq) {
        const hay = normalize(
          [it.titre, it.ville ?? "", it.code_postal ?? ""].join(" ")
        );
        if (!hay.includes(nq)) return false;
      }
      if (dept && (it.code_postal?.slice(0, 2) ?? "") !== dept) return false;
      return true;
    });
    out.sort((a, b) => {
      if (tri === "titre") return a.titre.localeCompare(b.titre);
      if (tri === "entreprises") return b.nbIntervenants - a.nbIntervenants;
      return b.createdAt.localeCompare(a.createdAt); // récent
    });
    return out;
  }, [items, q, dept, tri]);

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <main className="container max-w-6xl mx-auto p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold">
        {isAgence ? "Chantiers de mon agence" : "Mes chantiers"} ({filtered.length}
        {filtered.length !== items.length ? ` / ${items.length}` : ""})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">Aucun chantier pour l&apos;instant.</p>
          <p className="text-sm">
            Clique sur le bouton ci-dessous pour ajouter ton premier panneau.
          </p>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher un chantier (titre, ville, CP)…"
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Département</Label>
                  <select
                    className={selectCls}
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    <option value="">Tous</option>
                    {departements.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tri</Label>
                  <select
                    className={selectCls}
                    value={tri}
                    onChange={(e) =>
                      setTri(e.target.value as "recent" | "entreprises" | "titre")
                    }
                  >
                    <option value="recent">Plus récent</option>
                    <option value="entreprises">Plus d&apos;entreprises</option>
                    <option value="titre">Titre (A-Z)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun chantier ne correspond à ta recherche.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c) => (
                <ChantierCard
                  key={c.id}
                  id={c.id}
                  titre={c.titre}
                  ville={c.ville}
                  codePostal={c.code_postal}
                  photoUrl={c.photoUrl}
                  nbIntervenants={c.nbIntervenants}
                  createdAt={c.createdAt}
                  author={c.author}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto hidden sm:block">
        <Link href="/nouveau">
          <Button size="lg" className="w-full h-14 text-lg shadow-lg">
            <Plus className="size-6 mr-2" />
            Nouveau chantier
          </Button>
        </Link>
      </div>
    </main>
  );
}
