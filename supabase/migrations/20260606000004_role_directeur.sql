-- 20260606000004_role_directeur.sql
-- Ajoute le rôle 'directeur_commercial' (au-dessus du chef de secteur dans la
-- hiérarchie). Comme tous les rôles, il peut scanner et utiliser l'app ;
-- comme les rôles managers, il a accès au menu de supervision.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'commercial',
    'rc',
    'chef_secteur',
    'directeur_commercial',
    'admin'
  ));
