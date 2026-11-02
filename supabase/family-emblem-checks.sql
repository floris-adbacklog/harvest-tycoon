-- Is okay for a family's own emblem (30 Oct 2026, the owner: "is okay dat die uit het overzicht verdwijnt"): the staff mark a
-- picture as looked at, and it leaves Admin › Chat › Family emblems until someone reports it again or the family uploads another
-- (farm-api emblem-upload.js handleEmblemAdmin). One row per family: the picture that was looked at. New, nothing replaced.
create table if not exists public.family_emblem_checks (
 family_id uuid primary key references public.families(id) on delete cascade,
 emblem text not null check (char_length(emblem) <= 120),
 checked_by uuid references auth.users(id) on delete set null,
 checked_at timestamptz not null default now()
);
alter table public.family_emblem_checks enable row level security;
revoke all on public.family_emblem_checks from anon, authenticated;
