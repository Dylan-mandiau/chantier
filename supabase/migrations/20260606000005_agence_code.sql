-- 20260606000005_agence_code.sql
-- Ajoute un code court par agence (ex : "Le Mans" -> "MN") pour identification
-- rapide / affichage. Unique (les nulls multiples restent autorisés).

alter table public.agences add column if not exists code text;

create unique index if not exists agences_code_idx
  on public.agences (code)
  where code is not null;
