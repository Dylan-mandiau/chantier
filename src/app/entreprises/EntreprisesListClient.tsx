"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import type { StatutCommercial } from "@/lib/statut/compute";
import { Search } from "lucide-react";

export interface EntrepriseItem {
  id: string;
  raison_sociale: string;
  ville: string | null;
  code_postal: string | null;
  telephone: string | null;
  email: string | null;
  code_client_salti: string | null;
  nbChantiers: number;
  statut: StatutCommercial;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const STATUT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "connus", label: "🟢 Connus (déjà contactés)" },
  { value: "inconnus", label: "⚪ Inconnus (jamais contactés)" },
  { value: "client_salti", label: "⭐ Client SALTI" },
  { value: "relance_planifiee", label: "🟨 Relance prévue" },
  { value: "premier_contact", label: "🟦 Premier contact" },
  { value: "pas_de_reponse", label: "⏳ Sans réponse" },
  { value: "converti", label: "🟩 Converti" },
  { value: "refus", label: "🟥 Refus" },
];

export function EntreprisesListClient({ items }: { items: EntrepriseItem[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [dept, setDept] = useState("");
  const [aCompleter, setACompleter] = useState(false);
  const [tri, setTri] = useState<"chantiers" | "nom">("chantiers");

  // Départements présents (2 premiers chiffres du code postal), triés
  const departements = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.code_postal && it.code_postal.length >= 2) {
        set.add(it.code_postal.slice(0, 2));
      }
    });
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    const out = items.filter((it) => {
      // Recherche texte
      if (nq) {
        const hay = normalize(
          [
            it.raison_sociale,
            it.ville ?? "",
            it.code_postal ?? "",
            it.code_client_salti ?? "",
            it.email ?? "",
            it.telephone ?? "",
          ].join(" ")
        );
        if (!hay.includes(nq)) return false;
      }
      // Statut
      if (statut === "connus" && it.statut === "inconnu") return false;
      if (statut === "inconnus" && it.statut !== "inconnu") return false;
      if (
        statut &&
        statut !== "connus" &&
        statut !== "inconnus" &&
        it.statut !== statut
      )
        return false;
      // Département
      if (dept && (it.code_postal?.slice(0, 2) ?? "") !== dept) return false;
      // À compléter (sans tel OU sans email)
      if (aCompleter && it.telephone && it.email) return false;
      return true;
    });

    out.sort((a, b) =>
      tri === "nom"
        ? a.raison_sociale.localeCompare(b.raison_sociale)
        : b.nbChantiers - a.nbChantiers ||
          a.raison_sociale.localeCompare(b.raison_sociale)
    );
    return out;
  }, [items, q, statut, dept, aCompleter, tri]);

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <main className="container max-w-5xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">
          Entreprises ({filtered.length}
          {filtered.length !== items.length ? ` / ${items.length}` : ""})
        </h1>
        <div className="w-20" />
      </div>

      {/* Recherche + filtres */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom, ville, CP, code client, email…)"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <select
                className={selectCls}
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
              >
                {STATUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
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
                onChange={(e) => setTri(e.target.value as "chantiers" | "nom")}
              >
                <option value="chantiers">Plus de chantiers</option>
                <option value="nom">Nom (A-Z)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={aCompleter}
              onChange={(e) => setACompleter(e.target.checked)}
            />
            À compléter (sans téléphone ou sans email)
          </label>
        </CardContent>
      </Card>

      {/* Liste filtrée */}
      <div className="grid gap-2 lg:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune entreprise ne correspond à ta recherche.
          </p>
        )}
        {filtered.map((item) => (
          <Link key={item.id} href={`/entreprises/${item.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{item.raison_sociale}</p>
                    <StatutCommercialBadge statut={item.statut} />
                  </div>
                  {(item.code_postal || item.ville) && (
                    <p className="text-xs text-muted-foreground">
                      📍 {item.code_postal} {item.ville}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🏗 {item.nbChantiers} chantier{item.nbChantiers > 1 ? "s" : ""}
                    {!item.email || !item.telephone ? " · ⚠ à compléter" : ""}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0">›</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
