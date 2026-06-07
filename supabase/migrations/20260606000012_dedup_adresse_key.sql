-- 20260606000012_dedup_adresse_key.sql
-- Dédup ROBUSTE (#45) : matcher permis ET adresse simultanément.
--
-- Problème : aujourd'hui chaque chantier n'a qu'UNE clé (dedup_key) — permis
-- fort si dispo, sinon repli adresse. Conséquence : un même panneau scanné deux
-- fois produit deux clés différentes si le permis n'a été lu que sur l'un des
-- scans → le doublon n'est pas détecté.
--
-- Solution : on stocke EN PLUS une clé adresse seule (dedup_key_adresse) sur
-- chaque chantier. La détection (detectChantierDuplicate) matche alors sur la
-- clé permis OU sur la clé adresse. dedup_key reste inchangé (il alimente le
-- lien `panneaux`, contrainte unique).

-- 1. Colonne + index de recherche (agence_id, dedup_key_adresse).
alter table public.chantiers
  add column if not exists dedup_key_adresse text;

create index if not exists chantiers_dedup_adresse_idx
  on public.chantiers (agence_id, dedup_key_adresse);

-- 2. Fonction de normalisation alignée avec le JS norm() de
--    src/lib/dedup/chantier.ts : minuscules, suppression des accents français,
--    caractères non alphanumériques -> espace, trim. (translate() évite la
--    dépendance à l'extension unaccent et reste déterministe.)
create or replace function public.dedup_norm(s text)
returns text language sql immutable as $$
  select trim(regexp_replace(
    translate(
      lower(coalesce(s, '')),
      'àâäáãéèêëíìîïóòôöõúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    ),
    '[^a-z0-9]+', ' ', 'g'
  ))
$$;

-- 3. Backfill des lignes existantes : clé adresse "ad:<titre>|<adresse>|<cp>"
--    quand on a assez d'info (titre >= 3 ET (adresse >= 3 OU cp >= 2)), à
--    l'identique de chantierAdresseKey().
update public.chantiers
set dedup_key_adresse =
  'ad:' || public.dedup_norm(titre)
        || '|' || public.dedup_norm(adresse)
        || '|' || public.dedup_norm(code_postal)
where dedup_key_adresse is null
  and length(public.dedup_norm(titre)) >= 3
  and (
    length(public.dedup_norm(adresse)) >= 3
    or length(public.dedup_norm(code_postal)) >= 2
  );
