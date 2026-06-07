// src/lib/dedup/chantier.ts
// Clés de déduplication d'un chantier (panneau).

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, " ") // ponctuation -> espace
    .trim();
}

export type ChantierProjet = {
  permis_construire: string | null;
  titre: string | null;
  adresse: string | null;
  code_postal: string | null;
};

/**
 * Clé FORTE : "pc:<permis normalisé>" si le permis fait au moins 3 caractères
 * alphanumériques. On retire le PRÉFIXE de lettres ("PC", "PC N°", "N°"…) pour
 * que "PC N° 72181 24 Z0078" et "72181 24 Z0078" produisent la même clé.
 * (Un n° de permis commence par les chiffres du département/commune.)
 * Retourne null si le permis est absent/trop court.
 */
export function chantierPermisKey(p: Pick<ChantierProjet, "permis_construire">): string | null {
  const permis = norm(p.permis_construire)
    .replace(/[^a-z0-9]/g, "")
    .replace(/^[a-z]+/, "");
  return permis.length >= 3 ? `pc:${permis}` : null;
}

/**
 * Clé ADRESSE : "ad:<titre>|<adresse>|<cp>" (titre + adresse normalisés) quand
 * il y a assez d'information (titre >= 3 ET (adresse >= 3 OU cp >= 2)).
 * Retourne null sinon.
 *
 * La normalisation est alignée avec le backfill SQL (migration
 * 20260606000012) : minuscules, suppression des accents, caractères non
 * alphanumériques -> espace, trim — pour que les clés générées ici matchent
 * les clés des lignes existantes.
 */
export function chantierAdresseKey(
  p: Pick<ChantierProjet, "titre" | "adresse" | "code_postal">
): string | null {
  const titre = norm(p.titre);
  const adresse = norm(p.adresse);
  const cp = norm(p.code_postal);
  if (titre.length >= 3 && (adresse.length >= 3 || cp.length >= 2)) {
    return `ad:${titre}|${adresse}|${cp}`;
  }
  return null;
}

/**
 * Clé de dédup PRINCIPALE (stockée dans chantiers.dedup_key et utilisée pour le
 * lien `panneaux`) : permis fort en priorité, repli adresse sinon.
 * Retourne null s'il n'y a pas assez d'information pour dédupliquer.
 *
 * Pour la DÉTECTION de doublon, on compare en plus la clé adresse seule
 * (chantierAdresseKey) afin de rattraper le cas où le permis n'a été lu que
 * sur l'un des deux scans du même panneau — voir detectChantierDuplicate.
 */
export function chantierDedupKey(p: ChantierProjet): string | null {
  return chantierPermisKey(p) ?? chantierAdresseKey(p);
}
