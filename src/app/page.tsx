import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ChantiersListClient,
  type ChantierItem,
} from "./ChantiersListClient";
import { ProgressDashboard } from "@/components/progress-dashboard";

type ChantierListItem = {
  id: string;
  titre: string;
  ville: string | null;
  code_postal: string | null;
  photo_principale_url: string;
  created_at: string;
  created_by: string;
  chantier_intervenants: { count: number }[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Agence de l'utilisateur : la liste affiche les chantiers de SON agence
  // (collaboratif). Sans agence -> repli sur ses propres chantiers.
  const { data: profile } = await supabase
    .from("profiles")
    .select("agence_id, prenom")
    .eq("id", user.id)
    .single();
  const agenceId = profile?.agence_id ?? null;

  let query = supabase
    .from("chantiers")
    .select(
      `id, titre, ville, code_postal, photo_principale_url, created_at, created_by,
       chantier_intervenants(count)`
    )
    // Les brouillons (scans pas encore validés) restent hors du tableau de bord
    // tant qu'ils ne sont pas publiés. On les retrouve via /brouillons.
    .neq("status", "brouillon")
    .order("created_at", { ascending: false })
    .limit(300);
  query = agenceId
    ? query.eq("agence_id", agenceId)
    : query.eq("created_by", user.id);

  const { data: chantiers } = await query.returns<ChantierListItem[]>();

  const admin = createAdminClient();

  // Noms des auteurs : la RLS profiles est self-only, on passe par le
  // service role pour afficher "par X" sur les chantiers des collègues.
  const authorIds = [...new Set((chantiers ?? []).map((c) => c.created_by))];
  const authorMap = new Map<string, string>();
  if (authorIds.length) {
    const { data: authors } = await admin
      .from("profiles")
      .select("id, nom, prenom, email")
      .in("id", authorIds);
    (authors ?? []).forEach((a) => {
      const name =
        a.prenom && a.nom ? `${a.prenom} ${a.nom}` : a.email ?? "Inconnu";
      authorMap.set(a.id, name);
    });
  }

  const items: ChantierItem[] = await Promise.all(
    (chantiers ?? []).map(async (c) => {
      // Photos signées via service role (couvre les chantiers des collègues).
      const { data: signed } = await admin.storage
        .from("chantier-photos")
        .createSignedUrl(c.photo_principale_url, 1800);
      return {
        id: c.id,
        titre: c.titre,
        ville: c.ville,
        code_postal: c.code_postal,
        photoUrl: signed?.signedUrl ?? null,
        nbIntervenants: c.chantier_intervenants?.[0]?.count ?? 0,
        createdAt: c.created_at,
        author:
          c.created_by === user.id
            ? "Moi"
            : authorMap.get(c.created_by) ?? null,
      };
    })
  );

  // Stats de progression personnelle (#47) — compteurs "ma semaine".
  // contacts.created_by / created_at : table créée par la migration 011 ; si
  // absente, les comptes retombent à 0 sans casser la page.
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const weekStartISO = monday.toISOString().slice(0, 10);

  const [
    scansTotalRes,
    scansWeekRes,
    contactsTotalRes,
    contactsWeekRes,
    relancesAFaireRes,
    relancesEnRetardRes,
    brouillonsRes,
  ] = await Promise.all([
    supabase
      .from("chantiers")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("chantiers")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", weekStartISO),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", weekStartISO),
    supabase
      .from("relances")
      .select("id", { count: "exact", head: true })
      .eq("status", "planifiee"),
    supabase
      .from("relances")
      .select("id", { count: "exact", head: true })
      .eq("status", "planifiee")
      .lt("date_relance", todayISO),
    // Mes brouillons (scans pas encore validés) — accès dédié hors tableau de bord.
    supabase
      .from("chantiers")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("status", "brouillon"),
  ]);

  const brouillonsCount = brouillonsRes.count ?? 0;

  const stats = {
    prenom: profile?.prenom ?? null,
    scansTotal: scansTotalRes.count ?? 0,
    scansWeek: scansWeekRes.count ?? 0,
    contactsTotal: contactsTotalRes.count ?? 0,
    contactsWeek: contactsWeekRes.count ?? 0,
    relancesAFaire: relancesAFaireRes.count ?? 0,
    relancesEnRetard: relancesEnRetardRes.count ?? 0,
  };

  return (
    <ChantiersListClient
      items={items}
      isAgence={agenceId !== null}
      header={
        <>
          {brouillonsCount > 0 && (
            <Link
              href="/brouillons"
              className="flex items-center justify-between gap-2 rounded-lg border border-[#FFDD00] bg-[#FFDD00]/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-[#FFDD00]/20"
            >
              <span>
                📝 {brouillonsCount} brouillon{brouillonsCount > 1 ? "s" : ""} à
                finaliser
              </span>
              <span aria-hidden>→</span>
            </Link>
          )}
          <ProgressDashboard {...stats} />
        </>
      }
    />
  );
}
