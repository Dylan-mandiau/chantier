// src/lib/dedup/chantier.ts
// Clé de déduplication d'un chantier (panneau).

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, " ") // ponctuation -> espace
    .trim();
}

/**
 * Construit la clé de déduplication d'un chantier :
 *  - clé FORTE  : "pc:<permis normalisé>" si le permis de construire fait
 *                 au moins 3 caractères alphanumériques.
 *  - clé REPLI  : "ad:<titre>|<adresse>|<cp>" (titre + adresse normalisés)
 *                 quand il n'y a pas de permis exploitable.
 *
 * Retourne null s'il n'y a pas assez d'information pour dédupliquer
 * (ni permis, ni titre/adresse suffisants) : dans ce cas on ne déduplique pas.
 *
 * La normalisation est alignée avec le backfill SQL de la migration
 * 20260606000008 (suppression des caractères non alphanumériques + minuscules)
 * pour que les clés générées ici matchent les clés des lignes existantes.
 */
export function chantierDedupKey(p: {
  permis_construire: string | null;
  titre: string | null;
  adresse: string | null;
  code_postal: string | null;
}): string | null {
  const permis = norm(p.permis_construire).replace(/\s+/g, "");
  if (permis.length >= 3) return `pc:${permis}`;

  const titre = norm(p.titre);
  const adresse = norm(p.adresse);
  const cp = norm(p.code_postal);
  if (titre.length >= 3 && (adresse.length >= 3 || cp.length >= 2)) {
    return `ad:${titre}|${adresse}|${cp}`;
  }
  return null;
}
