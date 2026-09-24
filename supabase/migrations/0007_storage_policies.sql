-- =========================================================
-- Storage policies for product photo uploads.
-- Assumes a bucket named 'product-images' already exists (README step:
-- Supabase Dashboard -> Storage -> New bucket -> "product-images" -> Public).
-- If the bucket doesn't exist yet, create it first or these policies simply
-- won't match anything (they scope on bucket_id = 'product-images').
--
-- SAFE TO RE-RUN — see the header note in 0001_init.sql.
-- =========================================================

-- Anyone can view product photos (the bucket is public, but this policy is
-- what actually lets unauthenticated requests read objects from it via the
-- REST/Storage API when the bucket-level "public" toggle isn't enough on
-- its own).
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
on storage.objects for select
using (bucket_id = 'product-images');

-- Only active admins/staff can upload, replace, or delete product photos.
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images' and is_active_admin(auth.uid()));

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images"
on storage.objects for update
using (bucket_id = 'product-images' and is_active_admin(auth.uid()));

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images"
on storage.objects for delete
using (bucket_id = 'product-images' and is_active_admin(auth.uid()));
