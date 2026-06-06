import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AnalyzedPanneauSchema } from "@/lib/ai/schema";
import { normalizeRaisonSociale } from "@/lib/dedup/entreprise";
import { chantierDedupKey } from "@/lib/dedup/chantier";
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

  // === Déduplication ===
  // Clé : permis de construire (forte) ou repli adresse+titre. SELECT indexé
  // via service_role -> détecte aussi les chantiers d'autres commerciaux /
  // d'autres agences. Quelques ms, aucun appel API en plus, 0 temps d'analyse.
  // Priorité à un doublon DANS mon agence (cible de fusion collaborative).
  const dedupKey = chantierDedupKey(analyzed.projet);
  if (!force && dedupKey) {
    const { data: dups } = await admin
      .from("chantiers")
      .select("id, titre, created_by, created_at, agence_id")
      .eq("dedup_key", dedupKey)
      .order("created_at", { ascending: true });

    if (dups && dups.length > 0) {
      const sameAgenceDup =
        agenceId !== null
          ? dups.find((d) => d.agence_id === agenceId)
          : undefined;
      const target = sameAgenceDup ?? dups[0];

      const { data: owner } = await admin
        .from("profiles")
        .select("nom, prenom, email")
        .eq("id", target.created_by)
        .single();
      const ownerName =
        owner?.prenom && owner?.nom
          ? `${owner.prenom} ${owner.nom}`
          : owner?.email ?? "un autre commercial";

      const sameAgence = !!sameAgenceDup;
      const canOpen =
        target.created_by === user.id ||
        (target.agence_id !== null && target.agence_id === agenceId);

      return NextResponse.json(
        {
          duplicate: {
            id: target.id,
            titre: target.titre,
            owner_name: ownerName,
            created_at: target.created_at,
            can_open: canOpen,
            same_agence: sameAgence,
          },
        },
        { status: 409 }
      );
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
