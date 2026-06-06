-- 20260606000007_chantier_dedup.sql
-- Déduplication des chantiers (panneaux) par numéro de permis de construire.
--
-- Principe (v1, le plus simple / zéro appel API en plus / ~0 latence) :
--   * La détection fiable se fait À L'ENREGISTREMENT, côté serveur, via un
--     simple SELECT indexé sur permis_construire (quelques ms).
--   * Le partage est au niveau AGENCE : un commercial peut OUVRIR la fiche
--     d'un chantier déjà scanné par un collègue de la même agence.
--
-- Ce fichier :
--   1. Indexe permis_construire pour une recherche rapide.
--   2. Remplit chantiers.agence_id (jamais renseigné jusqu'ici) depuis le
--      créateur, pour les lignes existantes.
--   3. Ajoute une policy RLS de LECTURE au niveau agence (chantiers +
--      intervenants), qui s'ajoute en OR aux policies owner/hiérarchie.

-- 1. Index de recherche du permis (la clé de dédup)
create index if not exists chantiers_permis_idx
  on public.chantiers (permis_construire);

-- 2. Backfill agence_id depuis le profil du créateur (lignes existantes)
update public.chantiers c
set agence_id = p.agence_id
from public.profiles p
where p.id = c.created_by
  and c.agence_id is null;

-- 3. Lecture partagée au niveau agence.
--    Le sous-select sur profiles ne lit que la ligne de l'utilisateur courant
--    (profiles_self_select l'autorise), donc pas besoin de SECURITY DEFINER.
create policy "chantiers_agence_select" on public.chantiers
  for select using (
    agence_id is not null
    and agence_id = (
      select agence_id from public.profiles where id = auth.uid()
    )
  );

create policy "intervenants_agence_select" on public.chantier_intervenants
  for select using (
    exists (
      select 1 from public.chantiers c
      where c.id = chantier_intervenants.chantier_id
        and c.agence_id is not null
        and c.agence_id = (
          select agence_id from public.profiles where id = auth.uid()
        )
    )
  );
