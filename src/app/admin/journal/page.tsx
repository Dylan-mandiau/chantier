import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  user_id: string | null;
  agence_id: string | null;
  action: string;
  entite: string | null;
  entite_id: string | null;
  libelle: string | null;
  created_at: string;
};

const ACTIONS: { value: string; emoji: string; verbe: string }[] = [
  { value: "connexion", emoji: "🔑", verbe: "s'est connecté" },
  { value: "scan", emoji: "📸", verbe: "a scanné" },
  { value: "edit_chantier", emoji: "✏️", verbe: "a modifié un chantier" },
  { value: "suivi", emoji: "🎯", verbe: "a changé un suivi" },
  { value: "verifie", emoji: "✅", verbe: "a vérifié une entreprise" },
  { value: "verifie_retire", emoji: "☑️", verbe: "a retiré une vérification" },
  { value: "fusion", emoji: "🧹", verbe: "a fusionné un doublon" },
];
const ACTION_MAP = new Map(ACTIONS.map((a) => [a.value, a]));

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action: filtre } = await searchParams;
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
  let query = admin
    .from("activity_log")
    .select("id, user_id, agence_id, action, entite, entite_id, libelle, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtre) query = query.eq("action", filtre);
  const { data: rows } = await query.returns<Row[]>();
  const events = rows ?? [];

  // Noms (utilisateurs + agences).
  const userIds = [...new Set(events.map((e) => e.user_id).filter((x): x is string => !!x))];
  const agIds = [...new Set(events.map((e) => e.agence_id).filter((x): x is string => !!x))];
  const [usersRes, agencesRes] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, prenom, nom, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; prenom: string | null; nom: string | null; email: string }[] }),
    agIds.length
      ? admin.from("agences").select("id, nom").in("id", agIds)
      : Promise.resolve({ data: [] as { id: string; nom: string }[] }),
  ]);
  const userName = new Map<string, string>();
  (usersRes.data ?? []).forEach((p) => {
    const n = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
    userName.set(p.id, n || p.email || "Inconnu");
  });
  const agName = new Map<string, string>();
  (agencesRes.data ?? []).forEach((a) => agName.set(a.id, a.nom));

  const chipCls = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
    }`;

  return (
    <main className="container max-w-3xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Admin</Button>
        </Link>
        <h1 className="text-lg font-semibold">🧾 Journal d&apos;activité</h1>
        <div className="w-16" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href="/admin/journal" className={chipCls(!filtre)}>Tout</Link>
        {ACTIONS.map((a) => (
          <Link key={a.value} href={`/admin/journal?action=${a.value}`} className={chipCls(filtre === a.value)}>
            {a.emoji} {a.verbe.replace(/^a /, "").replace(/^s'est /, "")}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun événement{filtre ? " pour ce filtre" : ""}.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => {
            const cfg = ACTION_MAP.get(e.action);
            return (
              <li key={e.id} className="flex items-start gap-2 border-b pb-1.5 text-sm last:border-0">
                <span className="shrink-0">{cfg?.emoji ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <p>
                    <strong>{e.user_id ? userName.get(e.user_id) ?? "?" : "?"}</strong>{" "}
                    {cfg?.verbe ?? e.action}
                    {e.libelle ? <span className="text-muted-foreground"> — {e.libelle}</span> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(e.created_at)
                    )}
                    {e.agence_id && agName.get(e.agence_id) ? ` · ${agName.get(e.agence_id)}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">200 derniers événements.</p>
    </main>
  );
}
