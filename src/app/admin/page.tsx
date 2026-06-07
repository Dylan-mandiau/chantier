import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminFilters } from "./AdminFilters";
import { AdminChantiersList, type AdminChantierItem } from "./AdminChantiersList";

const ROLE_LABEL: Record<string, string> = {
  commercial: "Commercial",
  rc: "Resp. comm.",
  chef_secteur: "Chef secteur",
  directeur_commercial: "Directeur comm.",
  admin: "Admin",
};
const ROLE_BG: Record<string, string> = {
  commercial: "bg-blue-50 border-blue-200",
  rc: "bg-purple-50 border-purple-200",
  chef_secteur: "bg-amber-50 border-amber-200",
  directeur_commercial: "bg-rose-50 border-rose-200",
  admin: "bg-red-50 border-red-200",
};
const ROLE_BADGE: Record<string, string> = {
  commercial: "bg-blue-100 text-blue-800 border-blue-300",
  rc: "bg-purple-100 text-purple-800 border-purple-300",
  chef_secteur: "bg-amber-100 text-amber-800 border-amber-300",
  directeur_commercial: "bg-rose-100 text-rose-800 border-rose-300",
  admin: "bg-red-100 text-red-800 border-red-300",
};

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
  panneau_id: string | null;
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
  if (!["rc", "chef_secteur", "directeur_commercial", "admin"].includes(role))
    notFound();
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

  // Périmètre visible :
  //   - admin / directeur_commercial -> tout le monde (visu globale)
  //   - rc / chef_secteur            -> leur sous-arbre managé
  const hasGlobalView = isAdmin || role === "directeur_commercial";
  const visibleIds = hasGlobalView
    ? new Set(profiles.map((p) => p.id))
    : computeSubtree(user.id, profiles);
  const visibleProfiles = profiles.filter((p) => visibleIds.has(p.id));

  // Racines pour la vue arborescente "Mon équipe" :
  //   - global view -> les utilisateurs sans manager_id (top de l'organigramme)
  //   - manager     -> ses subordonnés directs
  const arbreRacines = hasGlobalView
    ? profiles.filter((p) => !p.manager_id && p.id !== user.id)
    : profiles.filter((p) => p.manager_id === user.id);
  const childrenByManager = new Map<string, ProfileRow[]>();
  profiles.forEach((p) => {
    if (p.manager_id) {
      const arr = childrenByManager.get(p.manager_id) ?? [];
      arr.push(p);
      childrenByManager.set(p.manager_id, arr);
    }
  });

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
    .select("id, titre, ville, created_by, created_at, panneau_id")
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

  // Stats récursives : pour chaque profil, total perso + total de ses descendants.
  // Permet d'afficher "Benoît LE CHATAL → 25 chantiers" qui agrège toute son équipe.
  type Stats = {
    nbChantiers: number;
    nbContacts: number;
    nbRelances: number;
    dernierScan: string | null;
  };
  const statsRecursives = new Map<string, Stats>();
  function computeStatsRec(profileId: string): Stats {
    const cached = statsRecursives.get(profileId);
    if (cached) return cached;
    const own = actMap.get(profileId);
    const result: Stats = own
      ? {
          nbChantiers: own.nbChantiers,
          nbContacts: own.nbContacts,
          nbRelances: own.nbRelances,
          dernierScan: own.dernierScan,
        }
      : { nbChantiers: 0, nbContacts: 0, nbRelances: 0, dernierScan: null };
    const enfants = childrenByManager.get(profileId) ?? [];
    enfants.forEach((e) => {
      const sub = computeStatsRec(e.id);
      result.nbChantiers += sub.nbChantiers;
      result.nbContacts += sub.nbContacts;
      result.nbRelances += sub.nbRelances;
      if (sub.dernierScan && (!result.dernierScan || sub.dernierScan > result.dernierScan)) {
        result.dernierScan = sub.dernierScan;
      }
    });
    statsRecursives.set(profileId, result);
    return result;
  }
  profiles.forEach((p) => computeStatsRec(p.id));

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

  const adminChantierItems: AdminChantierItem[] = chantiers.map((c) => {
    const p = profileById.get(c.created_by);
    return {
      id: c.id,
      titre: c.titre,
      ville: c.ville,
      parLabel: p ? profileLabel(p) : "?",
      agenceLabel: p?.agence_id ? agenceNom.get(p.agence_id) ?? null : null,
      dateLabel: fmtDate(c.created_at),
      dateIso: c.created_at,
      panneauId: c.panneau_id,
    };
  });

  return (
    <main className="container max-w-6xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">
          {isAdmin
            ? "🛡 Supervision équipe"
            : role === "directeur_commercial"
            ? "🌐 Supervision globale"
            : "👥 Mon équipe"}
        </h1>
        {isAdmin ? (
          <div className="flex gap-2 flex-wrap">
            <Link href="/admin/kpi">
              <Button variant="outline" size="sm">📊 KPI</Button>
            </Link>
            <Link href="/admin/journal">
              <Button variant="outline" size="sm">🧾 Journal</Button>
            </Link>
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

      {arbreRacines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              🌳 {hasGlobalView ? "Organigramme commercial" : "Mon équipe"} (
              {arbreRacines.length} subordonné{arbreRacines.length > 1 ? "s" : ""} direct
              {arbreRacines.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {arbreRacines
              .slice()
              .sort((a, b) => profileLabel(a).localeCompare(profileLabel(b)))
              .map((p) => (
                <MembreNode
                  key={p.id}
                  profile={p}
                  childrenByManager={childrenByManager}
                  statsRecursives={statsRecursives}
                  ownStats={actMap}
                  agenceNom={agenceNom}
                />
              ))}
            <p className="text-xs text-muted-foreground pt-1">
              Les chiffres incluent les sous-équipes (récursif). « perso » = activité directe du membre uniquement.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activité par membre (à plat)</CardTitle>
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
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Derniers chantiers scannés ({chantiers.length})</CardTitle>
            {isAdmin && (
              <Link href="/admin/doublons">
                <Button variant="outline" size="sm">🧹 Doublons à fusionner</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AdminChantiersList items={adminChantierItems} />
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

// Nœud récursif de l'organigramme. Affiche un membre + ses subordonnés
// indentés dessous, avec stats récursives (incluant sous-équipes) ET stats
// perso si le membre est lui-même actif.
function MembreNode({
  profile,
  childrenByManager,
  statsRecursives,
  ownStats,
  agenceNom,
  depth = 0,
}: {
  profile: ProfileRow;
  childrenByManager: Map<string, ProfileRow[]>;
  statsRecursives: Map<
    string,
    { nbChantiers: number; nbContacts: number; nbRelances: number; dernierScan: string | null }
  >;
  ownStats: Map<
    string,
    {
      profile: ProfileRow;
      nbChantiers: number;
      nbContacts: number;
      nbRelances: number;
      dernierScan: string | null;
    }
  >;
  agenceNom: Map<string, string>;
  depth?: number;
}) {
  const enfants = (childrenByManager.get(profile.id) ?? [])
    .slice()
    .sort((a, b) =>
      ((a.prenom && a.nom ? `${a.prenom} ${a.nom}` : a.email) ?? "").localeCompare(
        (b.prenom && b.nom ? `${b.prenom} ${b.nom}` : b.email) ?? ""
      )
    );
  const stats = statsRecursives.get(profile.id);
  const own = ownStats.get(profile.id);
  const hasChildren = enfants.length > 0;
  const label =
    profile.prenom && profile.nom
      ? `${profile.prenom} ${profile.nom}`
      : profile.email;
  const agence = profile.agence_id ? agenceNom.get(profile.agence_id) : null;

  return (
    <div>
      <div
        className={`border rounded-lg p-3 ${ROLE_BG[profile.role] ?? "bg-card"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{label}</p>
              <Badge
                variant="outline"
                className={`text-[10px] ${ROLE_BADGE[profile.role] ?? ""}`}
              >
                {ROLE_LABEL[profile.role] ?? profile.role}
              </Badge>
              {agence && (
                <Badge variant="outline" className="text-[10px]">
                  📍 {agence}
                </Badge>
              )}
            </div>
            {hasChildren && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {enfants.length} subordonné{enfants.length > 1 ? "s" : ""} direct
                {enfants.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="text-xs text-right shrink-0 grid grid-cols-3 gap-3">
            <Mini label="Chantiers" value={stats?.nbChantiers ?? 0} />
            <Mini label="Contacts" value={stats?.nbContacts ?? 0} />
            <Mini label="Relances" value={stats?.nbRelances ?? 0} />
          </div>
        </div>
        {hasChildren && own && own.nbChantiers + own.nbContacts + own.nbRelances > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1 italic">
            dont perso : {own.nbChantiers} chantiers · {own.nbContacts} contacts · {own.nbRelances} relances
          </p>
        )}
      </div>
      {hasChildren && (
        <div className="ml-4 mt-2 pl-3 border-l-2 border-muted space-y-2">
          {enfants.map((e) => (
            <MembreNode
              key={e.id}
              profile={e}
              childrenByManager={childrenByManager}
              statsRecursives={statsRecursives}
              ownStats={ownStats}
              agenceNom={agenceNom}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold leading-tight tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
