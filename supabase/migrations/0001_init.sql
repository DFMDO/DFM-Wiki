-- ============================================================
-- Museum Wiki – Initiales Datenbankschema
-- Ausführen im Supabase SQL Editor (oder per supabase db push)
-- ============================================================

-- Erweiterung für UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PROFILE (Rollen: employee / technician / admin)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'employee' check (role in ('admin','technician','employee')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

-- Bei jeder neuen Auth-Registrierung automatisch ein Profil anlegen
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'employee');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. BEREICHE
-- ------------------------------------------------------------
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '📁',
  color text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. STATIONEN / ANLAGEN
-- ------------------------------------------------------------
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  name text not null,
  description text,
  location text,
  icon text default '🔧',
  image_url text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. ANLEITUNGEN
-- ------------------------------------------------------------
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  title text not null,
  slug text not null,
  summary text,
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid references public.profiles(id),
  view_count int not null default 0,
  helpful_count int not null default 0,
  not_helpful_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, slug)
);

-- ------------------------------------------------------------
-- 5. VERSIONSVERLAUF
-- ------------------------------------------------------------
create table if not exists public.guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  editor_id uuid references public.profiles(id),
  content text not null,
  change_description text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. MEDIEN (Metadaten; Dateien selbst liegen in Supabase Storage)
-- ------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references public.guides(id) on delete cascade,
  storage_path text not null,
  file_type text,
  alt_text text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. TAGS
-- ------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists public.guide_tags (
  guide_id uuid references public.guides(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (guide_id, tag_id)
);

-- ------------------------------------------------------------
-- 8. FAVORITEN
-- ------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  guide_id uuid references public.guides(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, guide_id)
);

-- ------------------------------------------------------------
-- 9. FEEDBACK
-- ------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references public.guides(id) on delete cascade,
  user_id uuid references public.profiles(id),
  helpful boolean not null,
  comment text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 10. PROBLEMMELDUNGEN
-- ------------------------------------------------------------
create table if not exists public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references public.guides(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 11. AKTIVITÄTSPROTOKOLL
-- ------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.stations enable row level security;
alter table public.guides enable row level security;
alter table public.guide_versions enable row level security;
alter table public.media enable row level security;
alter table public.tags enable row level security;
alter table public.guide_tags enable row level security;
alter table public.favorites enable row level security;
alter table public.feedback enable row level security;
alter table public.problem_reports enable row level security;
alter table public.activity_logs enable row level security;

-- Hilfsfunktion: Rolle des aktuell eingeloggten Benutzers
create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---- profiles ----
create policy "Eigenes Profil lesen" on public.profiles
  for select using (auth.uid() = id or public.current_role() = 'admin');
create policy "Eigenes Profil aktualisieren" on public.profiles
  for update using (auth.uid() = id or public.current_role() = 'admin');

-- ---- areas ----
create policy "Bereiche lesen (alle eingeloggten)" on public.areas
  for select using (auth.role() = 'authenticated');
create policy "Bereiche verwalten (technician/admin)" on public.areas
  for all using (public.current_role() in ('admin','technician'))
  with check (public.current_role() in ('admin','technician'));

-- ---- stations ----
create policy "Stationen lesen (alle eingeloggten)" on public.stations
  for select using (auth.role() = 'authenticated');
create policy "Stationen verwalten (technician/admin)" on public.stations
  for all using (public.current_role() in ('admin','technician'))
  with check (public.current_role() in ('admin','technician'));

-- ---- guides ----
-- Mitarbeiter sehen nur veröffentlichte Anleitungen, Techniker/Admin sehen alles
create policy "Veröffentlichte Anleitungen lesen" on public.guides
  for select using (
    status = 'published' or public.current_role() in ('admin','technician')
  );
create policy "Anleitungen erstellen (technician/admin)" on public.guides
  for insert with check (public.current_role() in ('admin','technician'));
create policy "Anleitungen bearbeiten (technician/admin)" on public.guides
  for update using (public.current_role() in ('admin','technician'));
create policy "Anleitungen löschen (admin)" on public.guides
  for delete using (public.current_role() = 'admin');

-- ---- guide_versions ----
create policy "Versionen lesen (technician/admin)" on public.guide_versions
  for select using (public.current_role() in ('admin','technician'));
create policy "Versionen erstellen (technician/admin)" on public.guide_versions
  for insert with check (public.current_role() in ('admin','technician'));

-- ---- media ----
create policy "Medien lesen (alle eingeloggten)" on public.media
  for select using (auth.role() = 'authenticated');
create policy "Medien verwalten (technician/admin)" on public.media
  for all using (public.current_role() in ('admin','technician'))
  with check (public.current_role() in ('admin','technician'));

-- ---- tags / guide_tags ----
create policy "Tags lesen (alle eingeloggten)" on public.tags
  for select using (auth.role() = 'authenticated');
create policy "Tags verwalten (technician/admin)" on public.tags
  for all using (public.current_role() in ('admin','technician'))
  with check (public.current_role() in ('admin','technician'));
create policy "Guide-Tags lesen (alle eingeloggten)" on public.guide_tags
  for select using (auth.role() = 'authenticated');
create policy "Guide-Tags verwalten (technician/admin)" on public.guide_tags
  for all using (public.current_role() in ('admin','technician'))
  with check (public.current_role() in ('admin','technician'));

-- ---- favorites ----
create policy "Eigene Favoriten lesen" on public.favorites
  for select using (auth.uid() = user_id);
create policy "Eigene Favoriten verwalten" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- feedback ----
create policy "Feedback lesen (technician/admin)" on public.feedback
  for select using (public.current_role() in ('admin','technician'));
create policy "Feedback abgeben (alle eingeloggten)" on public.feedback
  for insert with check (auth.role() = 'authenticated');

-- ---- problem_reports ----
create policy "Meldungen lesen (eigene oder technician/admin)" on public.problem_reports
  for select using (reported_by = auth.uid() or public.current_role() in ('admin','technician'));
create policy "Meldung erstellen (alle eingeloggten)" on public.problem_reports
  for insert with check (auth.role() = 'authenticated');
create policy "Meldung bearbeiten (technician/admin)" on public.problem_reports
  for update using (public.current_role() in ('admin','technician'));

-- ---- activity_logs ----
create policy "Aktivitäten lesen (admin)" on public.activity_logs
  for select using (public.current_role() = 'admin');
create policy "Aktivität protokollieren (alle eingeloggten)" on public.activity_logs
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- SEED-DATEN (Beispieldaten zum Testen)
-- ============================================================
insert into public.areas (name, description, icon, sort_order) values
  ('Dauerausstellung', 'Ständige Ausstellungsbereiche', '🏛️', 1),
  ('Sonderausstellung', 'Wechselnde Sonderausstellungen', '🎪', 2),
  ('Gebäudetechnik', 'Haustechnik und Anlagen', '🏢', 3),
  ('Außenanlagen', 'Vorplatz und Außenbereich', '🌳', 4)
on conflict do nothing;
