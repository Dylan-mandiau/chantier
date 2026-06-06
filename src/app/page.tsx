import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ChantiersListClient,
  type ChantierItem,
} from "./ChantiersListClient";

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
    .select("agence_id")
    .eq("id", user.id)
    .single();
  const agenceId = profile?.agence_id ?? null;

  let query = supabase
    .from("chantiers")
    .select(
      `id, titre, ville, code_postal, photo_principale_url, created_at, created_by,
       chantier_intervenants(count)`
    )
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

  return <ChantiersListClient items={items} isAgence={agenceId !== null} />;
}
