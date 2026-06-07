import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MergeDoublonsClient, type DupGroup } from "./MergeDoublonsClient";

type Row = {
  id: string;
  titre: string;
  ville: string | null;
  created_by: string;
  created_at: string;
  agence_id: string | null;
  panneau_id: string | null;
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(iso));
}

export default async function DoublonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const admin = createAdminClient();

  // Toutes les fiches liées à un panneau (service role : toutes agences).
  const { data: chantiers } = await admin
    .from("chantiers")
    .select("id, titre, ville, created_by, created_at, agence_id, panneau_id")
    .not("panneau_id", "is", null)
    .order("created_at", { ascending: true })
    .returns<Row[]>();

  // Doublons = 2+ fiches partageant le même panneau DANS la même agence.
  const byKey = new Map<string, Row[]>();
  (chantiers ?? []).forEach((c) => {
    if (!c.panneau_id || !c.agence_id) return;
    const key = `${c.panneau_id}|${c.agence_id}`;
    const arr = byKey.get(key);
    if (arr) arr.push(c);
    else byKey.set(key, [c]);
  });
  const dupRows = [...byKey.values()].filter((g) => g.length >= 2);

  // Résolution des noms (auteurs + agences) via service role.
  const authorIds = [...new Set(dupRows.flat().map((c) => c.created_by))];
  const agenceIds = [
    ...new Set(dupRows.flat().map((c) => c.agence_id).filter((x): x is string => !!x)),
  ];
  const [authorsRes, agencesRes] = await Promise.all([
    authorIds.length
      ? admin.from("profiles").select("id, prenom, nom, email").in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; prenom: string | null; nom: string | null; email: string }[] }),
    agenceIds.length
      ? admin.from("agences").select("id, nom").in("id", agenceIds)
      : Promise.resolve({ data: [] as { id: string; nom: string }[] }),
  ]);
  const authorMap = new Map<string, string>();
  (authorsRes.data ?? []).forEach((a) => {
    const nom = [a.prenom, a.nom].filter(Boolean).join(" ").trim();
    authorMap.set(a.id, nom || a.email || "Inconnu");
  });
  const agenceMap = new Map<string, string>();
  (agencesRes.data ?? []).forEach((a) => agenceMap.set(a.id, a.nom));

  const groups: DupGroup[] = dupRows.map((g) => ({
    key: `${g[0].panneau_id}|${g[0].agence_id}`,
    titre: g[0].titre,
    agenceLabel: g[0].agence_id ? agenceMap.get(g[0].agence_id) ?? null : null,
    fiches: g.map((c) => ({
      id: c.id,
      titre: c.titre,
      ville: c.ville,
      parLabel: authorMap.get(c.created_by) ?? "?",
      dateLabel: fmtDate(c.created_at),
      dateIso: c.created_at,
    })),
  }));

  return (
    <main className="container max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Admin</Button>
        </Link>
        <h1 className="text-lg font-semibold">Doublons à fusionner</h1>
        <div className="w-16" />
      </div>

      <p className="text-sm text-muted-foreground">
        Fiches en double <strong>dans une même agence</strong> (même panneau).
        Les fiches d&apos;agences différentes ne sont pas des doublons et n&apos;apparaissent pas ici.
        La fusion déplace intervenants, relances, suivis et historique vers la fiche gardée,
        puis supprime l&apos;autre. <strong>Action irréversible.</strong>
      </p>

      {groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aucun doublon 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucune fiche en double détectée dans les agences. Tout est propre.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MergeDoublonsClient groups={groups} />
      )}
    </main>
  );
}
