-- Sign in with Apple, let go of when the account is deleted (16 Oct 2026, the owner chose "keep Apple's token at the sign-in"; Apple's
-- "Offering account deletion in your app" and TN3194). farm-api (supabase/functions/farm-api/apple-sign-in-service.js) keeps Apple's
-- refresh token here once, right after an Apple sign-in (operation 'apple_token': the iPhone app's one-time code exchanged at Apple, or
-- the website's token from Supabase, checked with Apple), and only when Apple says it belongs to the account's own Apple ID. When the
-- farmer deletes their account (account-delete-service.js), farm-api reads their tokens first and revokes each at Apple after the
-- deletion, so Harvest Tycoon leaves the "Sign in with Apple" list in their Apple Account.
-- One row per farmer and Apple client: com.harvesttycoon.web (the website, through Supabase) and com.harvesttycoon.app (the iPhone app's
-- own sheet); a new sign-in replaces the row of its client. Only Apple's refresh token, nothing else from Apple (no name, no address).
-- player_id on delete cascade: the account's deletion (harvest_delete_account, supabase/delete-account.sql, which deletes auth.users)
-- takes the rows with it in the same transaction, so that function needs no line for this table: no row keeps a player id after it.
-- The service role only: RLS on without a policy, and no grant to anon or authenticated (the token is only of use with our Apple key,
-- which lives in farm-api's secrets, and is still never readable from a browser).
-- Re-runnable: run the whole file in the SQL editor; a second run changes nothing.
create table if not exists public.apple_sign_in_tokens (
 player_id uuid not null references auth.users(id) on delete cascade,
 client_id text not null check (client_id in ('com.harvesttycoon.web','com.harvesttycoon.app')),
 refresh_token text not null check (refresh_token ~ '^[A-Za-z0-9_.-]{8,1024}$'),
 updated_at timestamptz not null default now(),
 primary key (player_id, client_id)
);
alter table public.apple_sign_in_tokens enable row level security;
revoke all on table public.apple_sign_in_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.apple_sign_in_tokens to service_role;
