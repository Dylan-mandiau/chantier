-- 20260606000015_entreprise_verifie.sql
-- #38 : flag « vérifié par humain » sur une entreprise (intervenant). L'IA lit
-- les coordonnées sur le panneau ; un humain peut confirmer qu'elles sont
-- justes. Donnée GLOBALE (les coordonnées d'une entreprise sont objectives),
-- affichée en badge ✅ sur les lignes intervenants et la fiche entreprise.

alter table public.entreprises
  add column if not exists verifie boolean not null default false;
alter table public.entreprises
  add column if not exists verifie_par uuid references public.profiles(id) on delete set null;
alter table public.entreprises
  add column if not exists verifie_at timestamptz;
