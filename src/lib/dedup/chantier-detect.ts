// src/lib/dedup/chantier-detect.ts
// Détection serveur d'un doublon de chantier, partagée entre :
//   - POST /api/chantiers          (garde-fou à l'enregistrement)
//   - POST /api/chantiers/check-duplicate (détection précoce, après analyse)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chantierPermisKey, chantierAdresseKey } from "./chantier";

export interface ChantierDuplicate {
  id: string;
  titre: string;
  owner_name: string;
  created_at: string;
  can_open: boolean;
  same_agence: boolean;
  /** URL signée de la photo de la fiche existante (pour comparaison visuelle). */
  photo_url: string | null;
}

type DupRow = {
  id: string;
  titre: string;
  created_by: string;
  created_at: string;
  agence_id: string | null;
  photo_principale_url: string | null;
};

const COLS = "id, titre, created_by, created_at, agence_id, photo_principale_url";

/**
 * Cherche un chantier déjà existant pour le même panneau. Dédup ROBUSTE : on
 * matche sur la clé permis OU sur la clé adresse (les deux signaux sont
 * calculés et testés simultanément). Cela rattrape le cas fréquent où le permis
 * n'a été lu que sur l'un des deux scans du même panneau : la clé adresse prend
 * alors le relais. Priorité au doublon DANS l'agence de l'utilisateur (cible de
 * fusion collaborative). Doit recevoir un client SERVICE ROLE pour détecter
 * au-delà de la RLS (chantiers d'autres commerciaux / agences).
 */
export async function detectChantierDuplicate(
  admin: SupabaseClient<Database>,
  opts: {
    userId: string;
    agenceId: string | null;
    projet: {
      permis_construire: string | null;
      titre: string | null;
      adresse: string | null;
      code_postal: string | null;
    };
  }
): Promise<ChantierDuplicate | null> {
  const permisKey = chantierPermisKey(opts.projet);
  const adresseKey = chantierAdresseKey(opts.projet);
  if (!permisKey && !adresseKey) return null;

  // Deux lookups indexés (permis sur dedup_key, adresse sur dedup_key_adresse)
  // fusionnés par id : un chantier matche s'il partage le permis OU l'adresse.
  const byId = new Map<string, DupRow>();

  if (permisKey) {
    const { data } = await admin
      .from("chantiers")
      .select(COLS)
      .eq("dedup_key", permisKey)
      .returns<DupRow[]>();
    (data ?? []).forEach((d) => byId.set(d.id, d));
  }
  if (adresseKey) {
    const { data } = await admin
      .from("chantiers")
      .select(COLS)
      .eq("dedup_key_adresse", adresseKey)
      .returns<DupRow[]>();
    (data ?? []).forEach((d) => byId.set(d.id, d));
  }

  const dups = [...byId.values()];
  if (dups.length === 0) return null;

  // Cible stable : la fiche la plus ancienne (origine du panneau).
  dups.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const sameAgenceDup =
    opts.agenceId !== null
      ? dups.find((d) => d.agence_id === opts.agenceId)
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

  // Photo signée de la fiche existante (sert au compare-image inter-agence).
  let photoUrl: string | null = null;
  if (target.photo_principale_url) {
    const { data: signed } = await admin.storage
      .from("chantier-photos")
      .createSignedUrl(target.photo_principale_url, 1800);
    photoUrl = signed?.signedUrl ?? null;
  }

  return {
    id: target.id,
    titre: target.titre,
    owner_name: ownerName,
    created_at: target.created_at,
    same_agence: !!sameAgenceDup,
    can_open:
      target.created_by === opts.userId ||
      (target.agence_id !== null && target.agence_id === opts.agenceId),
    photo_url: photoUrl,
  };
}
