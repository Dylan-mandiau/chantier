"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import { PremierContactButton } from "@/components/premier-contact-button";
import { PlanifierRelanceButton } from "@/components/planifier-relance-button";
import type { StatutCommercial } from "@/lib/statut/compute";

export interface IntervenantItem {
  id: string;
  role: string;
  lot_numero: string | null;
  lot_intitule: string | null;
  entreprise_id: string;
  raison_sociale: string;
  telephone: string | null;
  email: string | null;
  statut: StatutCommercial;
  code_client_salti: string | null;
}

type Filter = "all" | "salti" | "inconnu";

/**
 * Liste des intervenants d'un chantier, avec tri rapide :
 * Tous · ⭐ Clients SALTI · Inconnus. Évite le scroll sur les gros chantiers.
 */
export function IntervenantsList({
  items,
  chantierId,
  chantierTitre,
  commercialNom,
}: {
  items: IntervenantItem[];
  chantierId: string;
  chantierTitre: string;
  commercialNom: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      salti: items.filter((i) => i.code_client_salti).length,
      inconnu: items.filter((i) => i.statut === "inconnu").length,
    }),
    [items]
  );

  const shown = items.filter((i) =>
    filter === "all"
      ? true
      : filter === "salti"
      ? !!i.code_client_salti
      : i.statut === "inconnu"
  );

  const tabCls = (key: Filter) =>
    `text-xs px-3 py-1.5 rounded-full border transition ${
      filter === key
        ? "bg-primary text-primary-foreground border-transparent font-semibold"
        : "bg-background hover:bg-muted text-muted-foreground"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className={tabCls("all")} onClick={() => setFilter("all")}>
          Tous · {counts.all}
        </button>
        <button className={tabCls("salti")} onClick={() => setFilter("salti")}>
          ⭐ Clients SALTI · {counts.salti}
        </button>
        <button className={tabCls("inconnu")} onClick={() => setFilter("inconnu")}>
          Inconnus · {counts.inconnu}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aucun intervenant dans ce filtre.
        </p>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {shown.map((it) => (
            <div key={it.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">
                  {it.lot_numero ? `Lot ${it.lot_numero}` : it.role.replace(/_/g, " ")}
                </Badge>
                {it.lot_intitule && (
                  <span className="text-xs text-muted-foreground truncate">
                    {it.lot_intitule}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/entreprises/${it.entreprise_id}`}
                  className="font-medium underline-offset-2 hover:underline"
                  title="Ouvrir la fiche entreprise"
                >
                  {it.raison_sociale}
                </Link>
                <StatutCommercialBadge statut={it.statut} />
              </div>

              {(it.telephone || it.email) && (
                <div className="flex flex-wrap gap-2">
                  {it.telephone && (
                    <a
                      href={`tel:${it.telephone}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      📞 {it.telephone}
                    </a>
                  )}
                  {it.email && (
                    <a
                      href={`mailto:${it.email}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      📧 Email
                    </a>
                  )}
                </div>
              )}

              {/* Actions sur leur propre ligne -> toujours accessibles sur mobile */}
              <div className="flex flex-wrap gap-2">
                <PremierContactButton
                  entreprise={{
                    id: it.entreprise_id,
                    raison_sociale: it.raison_sociale,
                    email: it.email,
                    code_client_salti: it.code_client_salti,
                  }}
                  commercialNom={commercialNom}
                  intervenantContext={{
                    intervenant_id: it.id,
                    chantier_titre: chantierTitre,
                    lot_numero: it.lot_numero,
                    lot_intitule: it.lot_intitule,
                  }}
                />
                <PlanifierRelanceButton
                  entrepriseId={it.entreprise_id}
                  entrepriseNom={it.raison_sociale}
                  chantierId={chantierId}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
