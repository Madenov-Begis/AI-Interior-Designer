-- Private storage buckets. All application access goes through the server API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('source-images', 'source-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('visual-prompts', 'visual-prompts', false, 15728640, array['image/png', 'image/webp']),
  ('reference-images', 'reference-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('generation-originals', 'generation-originals', false, 52428800, array['image/jpeg', 'image/png', 'image/webp']),
  ('generation-results', 'generation-results', false, 52428800, array['image/jpeg', 'image/png', 'image/webp']),
  ('branding', 'branding', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

