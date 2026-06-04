import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Switch IA : Gemini 2.5 Flash (~10× moins cher que Claude Sonnet 4.6).
// Pour revenir à Claude : remplacer "gemini" par "claude" ci-dessous.
import { analyzePanneau } from "@/lib/ai/gemini";
import { z } from "zod";

const RequestSchema = z.object({
  photo_path: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { photo_path } = parsed.data;
  if (!photo_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Accès refusé à cette photo" }, { status: 403 });
  }

  const { data: signed, error: signedErr } = await supabase.storage
    .from("chantier-photos")
    .createSignedUrl(photo_path, 300);

  if (signedErr || !signed) {
    return NextResponse.json(
      { error: "Impossible de générer l'URL signée" },
      { status: 500 }
    );
  }

  try {
    const result = await analyzePanneau({ imageUrl: signed.signedUrl });
    return NextResponse.json({
      parsed: result.parsed,
      raw: result.raw,
      usage: result.usage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[analyze] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
