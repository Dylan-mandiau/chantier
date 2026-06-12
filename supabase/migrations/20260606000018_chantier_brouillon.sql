-- 20260606000018_chantier_brouillon.sql
-- Brouillons : un chantier est désormais créé en 'brouillon' dès l'analyse,
-- puis publié (-> 'actif') quand le commercial valide. Évite de perdre un scan
-- si on oublie de cliquer « Enregistrer ». Les brouillons sont exclus du
-- tableau de bord tant qu'ils ne sont pas validés (filtrage côté requête).

alter table public.chantiers drop constraint if exists chantiers_status_check;
alter table public.chantiers
  add constraint chantiers_status_check
  check (status in ('actif', 'archive', 'brouillon'));
