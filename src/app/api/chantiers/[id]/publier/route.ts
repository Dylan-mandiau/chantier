import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/chantiers/[id]/publier
 * Valide un brouillon « tel quel » : le passe en 'actif' pour qu'il apparaisse
 * sur le tableau de bord. Léger (pas de payload) : sert depuis la page
 * /brouillons pour finaliser un scan laissé de côté sans le ré-éditer.
 * Le garde `.eq("status","brouillon")` garantit qu'on ne publie qu'un brouillon.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { error } = await supabase
    .from("chantiers")
    .update({ status: "actif" })
    .eq("id", id)
    .eq("status", "brouillon");

  if (error) {
    console.error("[chantiers publier] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chantier_id: id });
}
