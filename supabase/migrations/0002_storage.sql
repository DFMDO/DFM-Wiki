-- ============================================================
-- Museum Wiki – Migration 2: Storage-Bucket für Fotos
-- Im Supabase SQL Editor NACH der ersten Migration ausführen
-- ============================================================

-- Bucket für Anleitungs-Fotos anlegen (öffentlich lesbar, da keine sensiblen Daten)
insert into storage.buckets (id, name, public)
values ('guide-images', 'guide-images', true)
on conflict (id) do nothing;

-- Jeder darf Bilder aus dem Bucket lesen (Bucket ist ohnehin öffentlich)
create policy "Guide-Bilder lesen"
  on storage.objects for select
  using (bucket_id = 'guide-images');

-- Nur eingeloggte Techniker/Admins dürfen Bilder hochladen
create policy "Guide-Bilder hochladen (technician/admin)"
  on storage.objects for insert
  with check (
    bucket_id = 'guide-images'
    and public.current_role() in ('admin','technician')
  );

-- Nur eingeloggte Techniker/Admins dürfen Bilder löschen
create policy "Guide-Bilder löschen (technician/admin)"
  on storage.objects for delete
  using (
    bucket_id = 'guide-images'
    and public.current_role() in ('admin','technician')
  );
