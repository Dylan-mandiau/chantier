import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import {
  computeStatutCommercial,
  type StatutInputs,
} from "@/lib/statut/compute";

// Jointure : un intervenant -> son entreprise + le chantier parent
type Row = {
  chantier_id: string;
  entreprise: {
    id: string;
    raison_sociale: string;
    ville: string | null;
    code_postal: string | null;
    telephone: string | null;
    email: string | null;
    code_client_salti: string | null;
  } | null;
};

export default async function EntreprisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tous les intervenants visibles par l'utilisateur (RLS limite à ses chantiers)
  const { data: rows } = await supabase
    .from("chantier_intervenants")
    .select(
      `chantier_id,
       entreprise:entreprises(id, raison_sociale, ville, code_postal, telephone, email, code_client_salti)`
    )
    .returns<Row[]>();

  // Agrège par entreprise : nb de chantiers distincts
  const byEnt = new Map<
    string,
    {
      entreprise: NonNullable<Row["entreprise"]>;
      chantierIds: Set<string>;
    }
  >();
  (rows ?? []).forEach((r) => {
    if (!r.entreprise) return;
    const existing = byEnt.get(r.entreprise.id);
    if (existing) {
      existing.chantierIds.add(r.chantier_id);
    } else {
      byEnt.set(r.entreprise.id, {
        entreprise: r.entreprise,
        chantierIds: new Set([r.chantier_id]),
      });
    }
  });

  const entIds = [...byEnt.keys()];
  const safeIds =
    entIds.length > 0 ? entIds : ["00000000-0000-0000-0000-000000000000"];

  // Statut commercial : contacts + relances de l'utilisateur sur ces entreprises
  const today = new Date().toISOString().slice(0, 10);
  const [contactsRes, relancesRes] = await Promise.all([
    supabase
      .from("contacts_envoyes")
      .select("entreprise_id, statut, envoye_at")
      .in("entreprise_id", safeIds)
      .order("envoye_at", { ascending: false }),
    supabase
      .from("relances")
      .select("entreprise_id, date_relance, motif")
      .in("entreprise_id", safeIds)
      .eq("status", "planifiee")
      .gte("date_relance", today)
      .order("date_relance", { ascending: true }),
  ]);

  const lastContact = new Map<string, NonNullable<StatutInputs["dernierContact"]>>();
  (contactsRes.data ?? []).forEach((c) => {
    if (!lastContact.has(c.entreprise_id)) {
      lastContact.set(c.entreprise_id, { statut: c.statut, envoye_at: c.envoye_at });
    }
  });
  const nextRelance = new Map<string, NonNullable<StatutInputs["prochaineRelance"]>>();
  (relancesRes.data ?? []).forEach((r) => {
    if (!nextRelance.has(r.entreprise_id)) {
      nextRelance.set(r.entreprise_id, { date_relance: r.date_relance, motif: r.motif });
    }
  });

  // Liste triée : plus de chantiers d'abord, puis nom
  const liste = [...byEnt.values()]
    .map((v) => ({
      ...v,
      nbChantiers: v.chantierIds.size,
      statut: computeStatutCommercial({
        codeClientSalti: v.entreprise.code_client_salti,
        dernierContact: lastContact.get(v.entreprise.id) ?? null,
        prochaineRelance: nextRelance.get(v.entreprise.id) ?? null,
        today,
      }),
    }))
    .sort(
      (a, b) =>
        b.nbChantiers - a.nbChantiers ||
        a.entreprise.raison_sociale.localeCompare(b.entreprise.raison_sociale)
    );

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Entreprises ({liste.length})</h1>
        <div className="w-20" />
      </div>

      {liste.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Aucune entreprise pour l&apos;instant. Scanne un panneau pour commencer.
        </p>
      )}

      <div className="space-y-2">
        {liste.map((item) => (
          <Link key={item.entreprise.id} href={`/entreprises/${item.entreprise.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">
                      {item.entreprise.raison_sociale}
                    </p>
                    <StatutCommercialBadge statut={item.statut} />
                  </div>
                  {(item.entreprise.code_postal || item.entreprise.ville) && (
                    <p className="text-xs text-muted-foreground">
                      📍 {item.entreprise.code_postal} {item.entreprise.ville}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🏗 {item.nbChantiers} chantier{item.nbChantiers > 1 ? "s" : ""}
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
