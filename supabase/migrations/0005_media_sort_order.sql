-- ============================================================
-- Museum Wiki – Migration 5: Reihenfolge für Fotos/Videos
-- Im Supabase SQL Editor NACH den vorherigen Migrationen ausführen
-- ============================================================

-- Erlaubt es, hochgeladene Fotos/Videos nachträglich per Pfeil-Buttons
-- umzusortieren, statt sie löschen und neu hochladen zu müssen.
alter table public.media add column if not exists sort_order integer not null default 0;
