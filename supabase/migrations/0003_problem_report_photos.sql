-- ============================================================
-- Museum Wiki – Migration 3: Fotos bei Problemmeldungen
-- Im Supabase SQL Editor NACH den vorherigen Migrationen ausführen
-- ============================================================

alter table public.problem_reports add column if not exists image_url text;

-- Auch normale Mitarbeiter (nicht nur Techniker/Admin) dürfen Fotos hochladen,
-- aber NUR in den Unterordner "problem-reports/" — für alles andere gilt
-- weiterhin die bisherige Einschränkung auf Techniker/Admin.
create policy "Problem-Report-Fotos hochladen (alle eingeloggten)"
  on storage.objects for insert
  with check (
    bucket_id = 'guide-images'
    and name like 'problem-reports/%'
    and auth.role() = 'authenticated'
  );
