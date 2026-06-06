import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFilters } from "./AdminFilters";

type ProfileRow = {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  role: string;
  agence_id: string | null;
  manager_id: string | null;
};

type ChantierRow = {
  id: string;
  titre: string;
  ville: string | null;
  created_by: string;
  created_at: string;
};

function profileLabel(p: ProfileRow): string {
  return p.prenom && p.nom ? `${p.prenom} ${p.nom}` : p.email;
}

// Sous-arbre managé (récursif via manager_id), racine incluse.
function computeSubtree(rootId: string, profiles: ProfileRow[]): Set<string> {
  const childrenByManager = new Map<string, string[]>();
  profiles.forEach((p) => {
    if (p.manager_id) {
      const arr = childrenByManager.get(p.manager_id) ?? [];
      arr.push(p.id);
      childrenByManager.set(p.manager_id, arr);
    }
  });
  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const child of childrenByManager.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ agence?: string; commercial?: string; days?: string }>;
}) {
  const sp = await searchParams;

  // Gate : admin OU manager (rc / chef_secteur)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = me?.role ?? "";
  if (!["rc", "chef_secteur", "admin"].includes(role)) notFound();
  const isAdmin = role === "admin";

  // Données via service_role (bypass RLS), filtrées ensuite au périmètre visible
  const admin = createAdminClient();
  const [{ data: profilesData }, { data: agencesData }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, nom, prenom, role, agence_id, manager_id")
      .order("email"),
    admin.from("agences").select("id, nom").order("nom"),
  ]);

  const profiles = (profilesData ?? []) as ProfileRow[];
  const agences = agencesData ?? [];
  const agenceNom = new Map(agences.map((a) => [a.id, a.nom]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Périmètre visible : admin = tout le monde ; manager = son sous-arbre
  const visibleIds = isAdmin
    ? new Set(profiles.map((p) => p.id))
    : computeSubtree(user.id, profiles);
  const visibleProfiles = profiles.filter((p) => visibleIds.has(p.id));

  // Filtres
  const days = Math.max(1, parseInt(sp.days ?? "30", 10) || 30);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  let commercialIds = [...visibleIds];
  if (sp.agence) {
    commercialIds = commercialIds.filter(
      (id) => profileById.get(id)?.agence_id === sp.agence
    );
  }
  if (sp.commercial && visibleIds.has(sp.commercial)) {
    commercialIds = [sp.commercial];
  }
  const safeCom =
    commercialIds.length > 0
      ? commercialIds
      : ["00000000-0000-0000-0000-000000000000"];

  // Chantiers période + périmètre
  const { data: chantiersData } = await admin
    .from("chantiers")
    .select("id, titre, ville, created_by, created_at")
    .in("created_by", safeCom)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  const chantiers = (chantiersData ?? []) as ChantierRow[];
  const chantierIds = chantiers.map((c) => c.id);
  const safeChantiers =
    chantierIds.length > 0
      ? chantierIds
      : ["00000000-0000-0000-0000-000000000000"];

  const [{ data: intervData }, { data: contactsData }, { data: relancesData }] =
    await Promise.all([
      admin
        .from("chantier_intervenants")
        .select("entreprise_id, chantier_id")
        .in("chantier_id", safeChantiers),
      admin
        .from("contacts_envoyes")
        .select("envoye_par, envoye_at")
        .in("envoye_par", safeCom)
        .gte("envoye_at", sinceIso),
      admin
        .from("relances")
        .select("created_by, status")
        .in("created_by", safeCom)
        .eq("status", "planifiee"),
    ]);

  const entreprisesDistinctes = new Set(
    (intervData ?? []).map((i) => i.entreprise_id)
  ).size;
  const nbContacts = (contactsData ?? []).length;
  const nbRelances = (relancesData ?? []).length;

  // Activité par commercial
  type Activite = {
    profile: ProfileRow;
    nbChantiers: number;
    nbContacts: number;
    nbRelances: number;
    dernierScan: string | null;
  };
  const actMap = new Map<string, Activite>();
  function ensure(id: string): Activite | null {
    const p = profileById.get(id);
    if (!p) return null;
    let a = actMap.get(id);
    if (!a) {
      a = { profile: p, nbChantiers: 0, nbContacts: 0, nbRelances: 0, dernierScan: null };
      actMap.set(id, a);
    }
    return a;
  }
  chantiers.forEach((c) => {
    const a = ensure(c.created_by);
    if (!a) return;
    a.nbChantiers++;
    if (!a.dernierScan || c.created_at > a.dernierScan) a.dernierScan = c.created_at;
  });
  (contactsData ?? []).forEach((c) => {
    const a = ensure(c.envoye_par);
    if (a) a.nbContacts++;
  });
  (relancesData ?? []).forEach((r) => {
    const a = ensure(r.created_by);
    if (a) a.nbRelances++;
  });
  const activites = [...actMap.values()].sort(
    (a, b) => b.nbChantiers - a.nbChantiers
  );

  // Options de filtres limitées au périmètre visible
  const commerciauxOptions = visibleProfiles.map((p) => ({
    id: p.id,
    label: profileLabel(p),
  }));
  const visibleAgenceIds = new Set(
    visibleProfiles.map((p) => p.agence_id).filter((x): x is string => !!x)
  );
  const agencesForFilter = isAdmin
    ? agences
    : agences.filter((a) => visibleAgenceIds.has(a.id));

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(iso));

  return (
    <main className="container max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">
          {isAdmin ? "🛡 Supervision équipe" : "👥 Mon équipe"}
        </h1>
        {isAdmin ? (
          <div className="flex gap-2">
            <Link href="/admin/templates">
              <Button variant="outline" size="sm">Templates</Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">Utilisateurs</Button>
            </Link>
          </div>
        ) : (
          <div className="w-16" />
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <AdminFilters agences={agencesForFilter} commerciaux={commerciauxOptions} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi value={chantiers.length} label="Chantiers scannés" />
        <Kpi value={entreprisesDistinctes} label="Entreprises uniques" />
        <Kpi value={nbContacts} label="Contacts envoyés" />
        <Kpi value={nbRelances} label="Relances actives" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité par commercial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Commercial</th>
                  <th className="text-left p-2">Agence</th>
                  <th className="text-center p-2">Chantiers</th>
                  <th className="text-center p-2">Contacts</th>
                  <th className="text-center p-2">Relances</th>
                  <th className="text-left p-2">Dernier scan</th>
                </tr>
              </thead>
              <tbody>
                {activites.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      Aucune activité sur la période.
                    </td>
                  </tr>
                )}
                {activites.map((a) => (
                  <tr key={a.profile.id} className="border-t">
                    <td className="p-2 font-medium">{profileLabel(a.profile)}</td>
                    <td className="p-2 text-muted-foreground">
                      {a.profile.agence_id
                        ? agenceNom.get(a.profile.agence_id) ?? "—"
                        : "—"}
                    </td>
                    <td className="p-2 text-center">{a.nbChantiers}</td>
                    <td className="p-2 text-center">{a.nbContacts}</td>
                    <td className="p-2 text-center">{a.nbRelances}</td>
                    <td className="p-2 text-muted-foreground">
                      {a.dernierScan ? fmtDate(a.dernierScan) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers chantiers scannés ({chantiers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {chantiers.slice(0, 30).map((c) => {
            const p = profileById.get(c.created_by);
            return (
              <Link key={c.id} href={`/chantiers/${c.id}`}>
                <div className="border rounded p-3 hover:bg-muted transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.ville ? `📍 ${c.ville} · ` : ""}
                      par {p ? profileLabel(p) : "?"}
                      {p?.agence_id ? ` (${agenceNom.get(p.agence_id) ?? "—"})` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {fmtDate(c.created_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
