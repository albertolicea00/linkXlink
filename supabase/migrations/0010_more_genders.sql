-- Expand the allowed gender values. The set is mirrored in
-- src/config/app-config.json (gender_options); keep both in sync.
-- Dropping the strict CHECK and using a length guard instead means future
-- gender additions are a config-only change (no migration needed).

alter table public.profiles drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or char_length(gender) <= 20);
