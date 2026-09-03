-- ============================================================
-- Museum Wiki – Migration 4: Externer Referenz-Link bei Anleitungen
-- Im Supabase SQL Editor NACH den vorherigen Migrationen ausführen
-- ============================================================

alter table public.guides add column if not exists reference_url text;
alter table public.guides add column if not exists reference_label text;
