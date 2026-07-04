-- Self-registration: anyone can create their own profile, but it always
-- lands inactive (pending) so spam never reaches the public feed. An admin
-- activates it from the panel (same flow as reactivating a profile).

create policy "public insert pending profiles"
  on public.profiles for insert
  with check (active = false and report_count = 0 and disabled_at is null);

-- One profile per WhatsApp number (blocks duplicate self-registrations).
create unique index if not exists profiles_whatsapp_unique
  on public.profiles (whatsapp);

-- Photos for self-registration: public uploads to the existing bucket.
create policy "public upload profile photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos');

-- Harden the bucket now that uploads are public.
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'profile-photos';
