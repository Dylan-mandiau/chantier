-- supabase/migrations/20260529000003_storage_bucket.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chantier-photos',
  'chantier-photos',
  false,
  5242880,  -- 5 MB max
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

create policy "users_upload_own_folder" on storage.objects
  for insert
  with check (
    bucket_id = 'chantier-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_read_own_folder" on storage.objects
  for select
  using (
    bucket_id = 'chantier-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_delete_own_folder" on storage.objects
  for delete
  using (
    bucket_id = 'chantier-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
