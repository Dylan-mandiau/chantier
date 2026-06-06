import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  chantier_intervenants: { count: number }[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chantiers } = await supabase
    .from("chantiers")
    .select(
      `id, titre, ville, code_postal, photo_principale_url, created_at,
       chantier_intervenants(count)`
    )
    // Toujours "mes" chantiers, même pour un admin (qui a une vue équipe
    // dédiée sur /admin). Sans ce filtre, la RLS admin renverrait tout.
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<ChantierListItem[]>();

  const items: ChantierItem[] = await Promise.all(
    (chantiers ?? []).map(async (c) => {
      const { data: signed } = await supabase.storage
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
      };
    })
  );

  return <ChantiersListClient items={items} />;
}
