"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CalendarClock, Phone, X } from "lucide-react";
import { toast } from "sonner";

export interface RelanceData {
  id: string;
  date_relance: string;
  motif: string;
  status: "planifiee" | "faite" | "reportee" | "annulee";
  chantier_id: string | null;
  entreprise: {
    id: string;
    raison_sociale: string;
    telephone: string | null;
    email: string | null;
    ville: string | null;
  } | null;
}

export function RelanceCard({ relance }: { relance: RelanceData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(
    patch: Partial<{ status: RelanceData["status"]; date_relance: string }>
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/relances/${relance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Mise à jour");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function reportToTomorrow() {
    const d = new Date(relance.date_relance);
    d.setDate(d.getDate() + 1);
    update({ date_relance: d.toISOString().slice(0, 10), status: "planifiee" });
  }

  if (!relance.entreprise) return null;

  return (
    <Card className="border-l-4 border-l-yellow-400">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{relance.entreprise.raison_sociale}</p>
            {relance.entreprise.ville && (
              <p className="text-xs text-muted-foreground">📍 {relance.entreprise.ville}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            📅{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "short",
            }).format(new Date(relance.date_relance))}
          </span>
        </div>
        <p className="text-sm italic text-muted-foreground">
          &quot;{relance.motif}&quot;
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {relance.entreprise.telephone && (
            <a
              href={`tel:${relance.entreprise.telephone}`}
              className="inline-flex items-center text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
            >
              <Phone className="size-3 mr-1" /> {relance.entreprise.telephone}
            </a>
          )}
          {relance.chantier_id && (
            <Link
              href={`/chantiers/${relance.chantier_id}`}
              className="inline-flex items-center text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
            >
              Voir le chantier →
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            onClick={() => update({ status: "faite" })}
            disabled={loading || relance.status === "faite"}
          >
            <Check className="size-3 mr-1" /> Faite
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reportToTomorrow}
            disabled={loading}
          >
            <CalendarClock className="size-3 mr-1" /> +1 jour
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => update({ status: "annulee" })}
            disabled={loading}
          >
            <X className="size-3 mr-1" /> Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
