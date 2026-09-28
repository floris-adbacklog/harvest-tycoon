-- Changing the email address (28 Sep 2026, farm-api event-service.js sendEmailChange / confirmEmailChange): the address a change
-- code went to, until the farmer types that code. Meanwhile the current address, and whether it is confirmed, stay as they are.
alter table public.email_checks add column if not exists new_email text;
