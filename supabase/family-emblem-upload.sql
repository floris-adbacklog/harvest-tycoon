-- A family's own emblem (30 Oct 2026, the owner: "Maak het mogelijk om je eigen family emblem te uploaden mits juist formaat en kleine
-- bestandsgrootte", 100 diamonds, option 2: shown at once, players can report it, the staff remove it). farm-api (emblem-upload.js)
-- checks every picture and writes it with the service role; nobody else can write. The bucket is public to read: the pictures show
-- in the chat, on the leaderboard and on family pages for everyone. New, nothing replaced: run it before the farm-api and the site.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-emblems', 'family-emblems', true, 102400, array['image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 102400, allowed_mime_types = array['image/png', 'image/webp'];

-- Reports of an own emblem: one per farmer per picture; the staff's list counts them (farm-api only, no policies).
create table if not exists public.family_emblem_reports (
 id bigserial primary key,
 family_id uuid not null references public.families(id) on delete cascade,
 emblem text not null check (char_length(emblem) <= 120),
 reporter uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique (family_id, emblem, reporter)
);
alter table public.family_emblem_reports enable row level security;
revoke all on public.family_emblem_reports from anon, authenticated;
