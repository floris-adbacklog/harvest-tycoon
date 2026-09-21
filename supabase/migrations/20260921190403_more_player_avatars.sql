-- Four more free cosmetic avatar IDs (25 in total). Already applied to the live database; kept here so the repo matches it.
-- The IDs are stable database keys: the pictures and names live in public/player-avatars.js.
alter table public.player_stats drop constraint if exists player_stats_avatar_id_check;
alter table public.player_stats add constraint player_stats_avatar_id_check check (avatar_id in ('default','orchard-grower','field-keeper','berry-gardener','mill-worker','sunflower-grower','village-gardener','old-hand','greenhouse-grower','beekeeper','market-gardener','dairy-farmer','meadow-keeper','apple-picker','herb-gardener','barn-builder','flower-grower','harvest-helper','valley-grower','orchard-veteran','farm-mechanic','pond-keeper','ranch-hand','cheese-maker','flower-tender'));
