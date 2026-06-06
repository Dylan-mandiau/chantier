import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AnalyzedPanneauSchema } from "@/lib/ai/schema";
import { normalizeRaisonSociale } from "@/lib/dedup/entreprise";
import { chantierDedupKey } from "@/lib/dedup/chantier";
import { detectChantierDuplicate } from "@/lib/dedup/chantier-detect";
import { z } from "zod";

const RequestSchema = z.object({
  photo_path: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  notes: z.string().nullable(),
  analyzed: AnalyzedPanneauSchema,
  // force=true : l'utilisateur a vu l'alerte "déjà scanné" et veut créer
  // quand même un nouveau chantier (on saute la dédup).
  force: z.boolean().optional().default(false),
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
  const { photo_path, lat, lng, notes, analyzed, force } = parsed.data;

  const admin = createAdminClient();

  // Agence du créateur : sert au partage agence (RLS) et à savoir si un
  // doublon trouvé est ouvrable par cet utilisateur.
  const { data: me } = await admin
    .from("profiles")
    .select("agence_id")
    .eq("id", user.id)
    .single();
  const agenceId = me?.agence_id ?? null;

  // === Déduplication (garde-fou à l'enregistrement) ===
  // Même détection que /api/chantiers/check-duplicate (appelée plus tôt, après
  // l'analyse). dedupKey est aussi stocké sur la ligne pour les recherches.
  const dedupKey = chantierDedupKey(analyzed.projet);
  if (!force) {
    const duplicate = await detectChantierDuplicate(admin, {
      userId: user.id,
      agenceId,
      projet: analyzed.projet,
    });
    if (duplicate) {
      return NextResponse.json({ duplicate }, { status: 409 });
    }
  }

  try {
    const { data: chantier, error: chantierErr } = await supabase
      .from("chantiers")
      .insert({
        titre: analyzed.projet.titre,
        adresse: analyzed.projet.adresse,
        ville: analyzed.projet.ville,
        code_postal: analyzed.projet.code_postal,
        latitude: lat,
        longitude: lng,
        permis_construire: analyzed.projet.permis_construire,
        date_pc: analyzed.projet.date_pc,
        montant_travaux_ht: analyzed.projet.montant_travaux_ht,
        photo_principale_url: photo_path,
        notes,
        created_by: user.id,
        agence_id: agenceId,
        dedup_key: dedupKey,
        ia_raw_json: analyzed as unknown as never,
      })
      .select("id")
      .single();

    if (chantierErr || !chantier) {
      console.error("[chantiers] insert chantier:", chantierErr);
      return NextResponse.json(
        { error: chantierErr?.message ?? "Échec insert chantier" },
        { status: 500 }
      );
    }

    for (let i = 0; i < analyzed.intervenants.length; i++) {
      const it = analyzed.intervenants[i];
      const normalisee = normalizeRaisonSociale(it.raison_sociale);

      let entrepriseId: string | null = null;

      const { data: existing } = await admin
        .from("entreprises")
        .select("id")
        .eq("raison_sociale_normalisee", normalisee)
        .eq("code_postal", it.code_postal ?? "")
        .maybeSingle();

      if (existing) {
        entrepriseId = existing.id;
      } else {
        const { data: created, error: entrErr } = await admin
          .from("entreprises")
          .insert({
            raison_sociale: it.raison_sociale,
            raison_sociale_normalisee: normalisee,
            ville: it.ville,
            code_postal: it.code_postal ?? "",
            adresse: it.adresse,
            telephone: it.telephone,
            email: it.email,
            source_info: {
              ...(it.telephone ? { telephone: { src: "panneau", conf: 1.0 } } : {}),
              ...(it.email ? { email: { src: "panneau", conf: 1.0 } } : {}),
            },
          })
          .select("id")
          .single();
        if (entrErr || !created) {
          console.error("[chantiers] insert entreprise:", entrErr);
          continue;
        }
        entrepriseId = created.id;
      }

      await supabase.from("chantier_intervenants").insert({
        chantier_id: chantier.id,
        entreprise_id: entrepriseId,
        role: it.role,
        lot_numero: it.lot_numero,
        lot_intitule: it.lot_intitule,
        rang: it.rang,
        source_info: { confiance_lecture: it.confiance_lecture },
        ordre: i,
      });
    }

    return NextResponse.json({ chantier_id: chantier.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[chantiers] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
