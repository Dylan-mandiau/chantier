"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export interface ChantierAuditItem {
  id: string;
  action: string;
  changements: Record<string, { avant: unknown; apres: unknown }> | null;
  modifie_at: string;
  auteur: string | null;
}

// Libellés des champs (alignés avec CHANTIER_FIELD_LABELS côté serveur).
const FIELD_LABELS: Record<string, string> = {
  titre: "Titre",
  adresse: "Adresse",
  ville: "Ville",
  code_postal: "Code postal",
  permis_construire: "Permis de construire",
  date_pc: "Date du permis",
  montant_travaux_ht: "Montant travaux HT",
  notes: "Notes",
};

const ACTION_LABEL: Record<string, string> = {
  creation: "a scanné la fiche",
  modification: "a modifié",
  import: "a importé la fiche dans son agence",
  suppression: "a supprimé la fiche",
};

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function ChantierHistory({ audit }: { audit: ChantierAuditItem[] }) {
  const [open, setOpen] = useState(false);
  if (audit.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Historique des modifications ({audit.length})
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {open ? "Masquer" : "Voir"}
          </span>
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          <ul className="space-y-3">
            {audit.map((a) => (
              <li key={a.id} className="border-l-2 border-l-border pl-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(a.modifie_at))}
                </div>
                <div>
                  <strong>{a.auteur ?? "?"}</strong>{" "}
                  {ACTION_LABEL[a.action] ?? a.action}
                </div>
                {a.action === "modification" &&
                  a.changements &&
                  Object.keys(a.changements).length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(a.changements).map(([champ, v]) => (
                        <li key={champ} className="text-xs">
                          <span className="font-medium">
                            {FIELD_LABELS[champ] ?? champ}
                          </span>{" "}
                          : <span className="text-muted-foreground line-through">{fmt(v.avant)}</span>{" "}
                          → <span className="text-foreground">{fmt(v.apres)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
