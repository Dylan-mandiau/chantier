import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ContactActions } from "@/components/contact-actions";
import { SUIVI_STATUTS, suiviConfig } from "@/lib/suivi/statuts";

type Row = {
  statut: string;
  updated_at: string;
  entreprise: { id: string; raison_sociale: string; telephone: string | null; email: string | null } | null;
  chantier: { id: string; titre: string; ville: string | null } | null;
};

export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut: filtre } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("intervenant_suivi")
    .select(
      `statut, updated_at,
       entreprise:entreprises(id, raison_sociale, telephone, email),
       chantier:chantiers(id, titre, ville)`
    )
    .order("updated_at", { ascending: false })
    .returns<Row[]>();

  const items = (rows ?? []).filter((r) => r.entreprise);

  // Compteurs par statut + regroupement.
  const counts = new Map<string, number>();
  items.forEach((r) => counts.set(r.statut, (counts.get(r.statut) ?? 0) + 1));

  const chipCls = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
    }`;

  const statutsAffiches = SUIVI_STATUTS.filter(
    (s) => (counts.get(s.value) ?? 0) > 0 && (!filtre || filtre === s.value)
  );

  return (
    <main className="container max-w-3xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Mon suivi</h1>
        <div className="w-16" />
      </div>

      <p className="text-sm text-muted-foreground">
        Où en sont tes affaires, regroupées par étape. Touche une entreprise pour
        ouvrir sa fiche.
      </p>

      {/* Filtres par statut (wrap, pas de scroll horizontal) */}
      <div className="flex flex-wrap gap-2">
        <Link href="/suivi" className={chipCls(!filtre)}>
          Tout ({items.length})
        </Link>
        {SUIVI_STATUTS.filter((s) => (counts.get(s.value) ?? 0) > 0).map((s) => (
          <Link key={s.value} href={`/suivi?statut=${s.value}`} className={chipCls(filtre === s.value)}>
            {s.emoji} {s.label} ({counts.get(s.value)})
          </Link>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">
          Aucun suivi pour l&apos;instant. Indique « Où j&apos;en suis » sur les
          intervenants d&apos;un chantier pour les retrouver ici.
        </p>
      )}

      {statutsAffiches.map((s) => {
        const cfg = suiviConfig(s.value);
        const list = items.filter((r) => r.statut === s.value);
        return (
          <section key={s.value} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg?.classes ?? ""}`}>
                {s.emoji} {s.label}
              </span>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((r, i) => (
                <div key={r.entreprise!.id + i} className="rounded-lg border bg-card p-3 space-y-1.5">
                  <Link
                    href={`/entreprises/${r.entreprise!.id}`}
                    className="flex items-start justify-between gap-2 group"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate group-hover:underline">
                        {r.entreprise!.raison_sociale}
                      </span>
                      {r.chantier && (
                        <span className="block text-xs text-muted-foreground truncate">
                          🏗 {r.chantier.titre}
                          {r.chantier.ville ? ` · ${r.chantier.ville}` : ""}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground shrink-0">›</span>
                  </Link>
                  <ContactActions
                    telephone={r.entreprise!.telephone}
                    email={r.entreprise!.email}
                    nom={r.entreprise!.raison_sociale}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
