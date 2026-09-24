-- Twenty farmer avatars: the painted set of 25 September 2026 (a new default face and 19 redrawn farmers). Five IDs left the
-- game; the three players who had one of them were set back to 'default' first, so no row breaks the check.
-- The IDs are stable database keys: the pictures and names live in public/player-avatars.js.
update public.player_stats set avatar_id='default' where avatar_id in ('field-keeper','mill-worker','beekeeper','meadow-keeper','harvest-helper');
alter table public.player_stats drop constraint if exists player_stats_avatar_id_check;
alter table public.player_stats add constraint player_stats_avatar_id_check check (avatar_id in ('default','orchard-grower','berry-gardener','sunflower-grower','village-gardener','old-hand','greenhouse-grower','market-gardener','dairy-farmer','apple-picker','herb-gardener','barn-builder','flower-grower','valley-grower','orchard-veteran','farm-mechanic','pond-keeper','ranch-hand','cheese-maker','flower-tender'));
