-- 20260606000008_chantier_collab_agence.sql
-- Phase 1 — Collaboration intra-agence.
--   1. dedup_key : clé de déduplication (permis fort, repli adresse+titre).
--   2. Écriture partagée au niveau agence (UPDATE) : tout membre de l'agence
--      peut enrichir la fiche commune. La suppression reste owner/admin.

-- 1. Colonne dedup_key + index (agence_id, dedup_key) pour la recherche
alter table public.chantiers add column if not exists dedup_key text;

create index if not exists chantiers_dedup_idx
  on public.chantiers (agence_id, dedup_key);

-- 2. Backfill des lignes existantes : clé permis quand dispo. La normalisation
--    (suppression des non-alphanumériques + minuscules) est alignée avec la
--    fonction JS chantierDedupKey (cas sans accent, ce qui est le cas des
--    numéros de permis). Les chantiers sans permis seront re-clés à leur
--    prochain enregistrement, ou nettoyés via l'outil admin de fusion.
update public.chantiers
set dedup_key = 'pc:' || lower(regexp_replace(permis_construire, '[^a-zA-Z0-9]', '', 'g'))
where dedup_key is null
  and permis_construire is not null
  and length(regexp_replace(permis_construire, '[^a-zA-Z0-9]', '', 'g')) >= 3;

-- 3. Écriture partagée au niveau agence.
--    Le sous-select ne lit que la ligne profiles de l'utilisateur courant
--    (profiles_self_select), donc pas besoin de SECURITY DEFINER.
create policy "chantiers_agence_update" on public.chantiers
  for update using (
    agence_id is not null
    and agence_id = (
      select agence_id from public.profiles where id = auth.uid()
    )
  );
