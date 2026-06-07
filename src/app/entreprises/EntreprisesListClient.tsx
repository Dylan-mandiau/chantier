"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactActions } from "@/components/contact-actions";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import type { StatutCommercial } from "@/lib/statut/compute";
import { Search, X } from "lucide-react";

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

// Filtres statut sous forme de chips (toggle). `match` reproduit la logique
// existante (connus = déjà contactés, inconnus = jamais contactés).
type StatutChip = {
  value: string;
  label: string;
  match: (s: StatutCommercial) => boolean;
};

const STATUT_CHIPS: StatutChip[] = [
  { value: "client_salti", label: "⭐ Client", match: (s) => s === "client_salti" },
  { value: "relance_planifiee", label: "🟨 Relance", match: (s) => s === "relance_planifiee" },
  { value: "premier_contact", label: "🟦 1er contact", match: (s) => s === "premier_contact" },
  { value: "pas_de_reponse", label: "⏳ Sans réponse", match: (s) => s === "pas_de_reponse" },
  { value: "converti", label: "🟩 Converti", match: (s) => s === "converti" },
  { value: "refus", label: "🟥 Refus", match: (s) => s === "refus" },
  { value: "inconnus", label: "⚪ Inconnus", match: (s) => s === "inconnu" },
  { value: "connus", label: "🟢 Connus", match: (s) => s !== "inconnu" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-foreground border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function EntreprisesListClient({ items }: { items: EntrepriseItem[] }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState(""); // "" = tous
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

  // Compteurs par statut (sur l'ensemble), pour afficher des chips parlantes
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const chip of STATUT_CHIPS) {
      m[chip.value] = items.filter((it) => chip.match(it.statut)).length;
    }
    m["a_completer"] = items.filter((it) => !it.telephone || !it.email).length;
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    const chip = STATUT_CHIPS.find((c) => c.value === statut);
    const out = items.filter((it) => {
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
      if (chip && !chip.match(it.statut)) return false;
      if (dept && (it.code_postal?.slice(0, 2) ?? "") !== dept) return false;
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

  const hasFilters = q !== "" || statut !== "" || dept !== "" || aCompleter;
  const selectCls =
    "bg-background border rounded-md px-2 py-1.5 text-xs text-foreground";

  function reset() {
    setQ("");
    setStatut("");
    setDept("");
    setACompleter(false);
  }

  return (
    <main className="container max-w-5xl mx-auto p-4 space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">
          Entreprises ({filtered.length}
          {filtered.length !== items.length ? ` / ${items.length}` : ""})
        </h1>
        <div className="w-16" />
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, ville, CP, code client, email…)"
          className="pl-9"
        />
      </div>

      {/* Filtres statut en chips (scroll horizontal sur mobile) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={statut === ""} onClick={() => setStatut("")}>
          Tous ({items.length})
        </Chip>
        {STATUT_CHIPS.filter((c) => counts[c.value] > 0).map((c) => (
          <Chip
            key={c.value}
            active={statut === c.value}
            onClick={() => setStatut(statut === c.value ? "" : c.value)}
          >
            {c.label} ({counts[c.value]})
          </Chip>
        ))}
        {counts["a_completer"] > 0 && (
          <Chip active={aCompleter} onClick={() => setACompleter((v) => !v)}>
            ⚠ À compléter ({counts["a_completer"]})
          </Chip>
        )}
      </div>

      {/* Département + tri + reset */}
      <div className="flex flex-wrap items-center gap-2">
        {departements.length > 1 && (
          <select
            className={selectCls}
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            aria-label="Département"
          >
            <option value="">📍 Tous dépts</option>
            {departements.map((d) => (
              <option key={d} value={d}>Dépt {d}</option>
            ))}
          </select>
        )}
        <select
          className={selectCls}
          value={tri}
          onChange={(e) => setTri(e.target.value as "chantiers" | "nom")}
          aria-label="Tri"
        >
          <option value="chantiers">↕ Plus de chantiers</option>
          <option value="nom">↕ Nom (A-Z)</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Liste filtrée */}
      <div className="grid gap-2 lg:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 lg:col-span-2">
            Aucune entreprise ne correspond à ta recherche.
          </p>
        )}
        {filtered.map((item) => {
          const hasCoords = !!(item.telephone || item.email);
          return (
            <div
              key={item.id}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <Link
                href={`/entreprises/${item.id}`}
                className="block p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{item.raison_sociale}</p>
                      <StatutCommercialBadge statut={item.statut} />
                    </div>
                    {(item.code_postal || item.ville) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📍 {item.code_postal} {item.ville}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      🏗 {item.nbChantiers} chantier{item.nbChantiers > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 mt-0.5">›</span>
                </div>
              </Link>

              {/* Actions inline (hors du Link : liens tel:/mailto: + confirmation) */}
              {hasCoords ? (
                <div className="border-t bg-muted/20 px-3 py-2">
                  <ContactActions
                    telephone={item.telephone}
                    email={item.email}
                    nom={item.raison_sociale}
                  />
                </div>
              ) : (
                <div className="border-t px-3 py-2 text-xs text-amber-700">
                  ⚠ Aucune coordonnée — ouvre la fiche pour compléter
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
