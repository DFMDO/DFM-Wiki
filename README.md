# Museum Wiki

Internes Wissenssystem für Fehlerbehebungen und Anleitungen zu Stationen und
Anlagen im Museum. Struktur: **Bereich → Station/Anlage → Anleitung**.

## Aktueller Funktionsumfang (Ausbaustufe 1)

- ✅ Login/Logout, Session-Management, Passwort-zurücksetzen (Supabase Auth)
- ✅ Drei Rollen: `admin`, `technician`, `employee` (per Row Level Security in der Datenbank abgesichert, nicht nur im Frontend)
- ✅ Bereiche → Stationen → Anleitungen anlegen, lesen, bearbeiten
- ✅ Anleitungsstatus: Entwurf / Veröffentlicht / Archiviert
- ✅ Versionsverlauf wird beim Bearbeiten mitgeschrieben (`guide_versions`)
- ✅ Volltextsuche über Titel/Kurzbeschreibung/Inhalt
- ✅ Feedback (👍/👎) und Problemmeldungen pro Anleitung
- ✅ Admin-/Verwaltungsbereich zum Anlegen von Bereichen und Stationen
- ✅ GitHub Actions Workflow für automatisches Deployment auf GitHub Pages

## Noch nicht enthalten (nächste Ausbaustufen)

- QR-Code-Erzeugung/Verwaltung/Druckansicht
- Rich-Text-Editor mit Bildern/Videos statt einfachem Textfeld
- Medien-Upload über Supabase Storage
- Favoriten-Seite, Versionsverlauf-Ansicht mit Wiederherstellung
- Vollständiger Adminbereich (Benutzerverwaltung, Statistiken, Aktivitätsprotokoll-Ansicht)
- Automatisierte Tests
- Dark/Light-Mode-Umschalter (aktuell fest im Dark Mode)

## Voraussetzungen

- Node.js (Version 20 empfohlen)
- Ein GitHub-Account mit einem Repository für dieses Projekt
- Ein Supabase-Account mit einem Projekt

## Installation

```bash
git clone <dein-repo-url>
cd museum-wiki
npm install
```

## Umgebungsvariablen

Kopiere `.env.example` zu `.env` und trage deine Supabase-Zugangsdaten ein
(Supabase Dashboard → Project Settings → API):

```text
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_PUBLISHABLE_ODER_ANON_KEY
```

**Wichtig:** Niemals den `service_role`-/`secret`-Key hier eintragen — nur den
`anon`-/`publishable`-Key, der bewusst für die Nutzung im Frontend gedacht ist.

## Entwicklung

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Vorschau des Builds

```bash
npm run preview
```

## Supabase einrichten

1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen
2. Im **SQL Editor** den Inhalt von `supabase/migrations/0001_init.sql`
   ausführen — das legt alle Tabellen, Sicherheitsregeln (RLS) und ein paar
   Beispiel-Bereiche an
3. Unter **Authentication → Providers** sicherstellen, dass „Email“ aktiviert ist
4. Ersten Benutzer anlegen: Unter **Authentication → Users → Add user** einen
   Account erstellen. Er bekommt automatisch die Rolle `employee`.
5. Diesen Benutzer zum Admin machen: Im **SQL Editor**:
   ```sql
   update public.profiles set role = 'admin' where email = 'deine@email.de';
   ```

## Kollegen einladen

### Einmalig mehrere auf einmal (Skript)

1. [Node.js](https://nodejs.org) installieren, falls nicht vorhanden
2. Im Projektordner: `npm install @supabase/supabase-js`
3. Terminal öffnen und ausführen (Platzhalter ersetzen):
   ```bash
   SUPABASE_URL=https://dein-projekt.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key \
   node scripts/invite-users.mjs
   ```
   Den `service_role`-Schlüssel findest du unter Project Settings → API. **Niemals**
   committen oder in die App einbauen — nur hier, einmalig, lokal verwenden.

### Danach: direkt aus der Wiki-App heraus (empfohlen für den Alltag)

Dafür muss einmalig die Edge Function eingerichtet werden:

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installieren
2. `supabase login`
3. `supabase link --project-ref DEIN-PROJEKT-REF` (der Teil der URL vor `.supabase.co`)
4. `supabase functions deploy invite-user`
5. Den service_role-Schlüssel sicher bei Supabase hinterlegen (läuft nur dort, nie im
   Browser):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key
   ```

Danach steht in der Wiki-App unter **Verwaltung → Benutzerverwaltung** oben ein Feld
"Neuen Kollegen einladen" bereit — nur für Admins sichtbar und nutzbar.

## GitHub Pages einrichten

1. Repository auf GitHub anlegen und dieses Projekt pushen
2. Unter **Settings → Pages** die Quelle auf „GitHub Actions“ stellen
3. Unter **Settings → Secrets and variables → Actions** zwei Secrets anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In `vite.config.ts` den `base`-Pfad an den Namen deines Repositorys anpassen
   (z.B. `/museum-wiki/`)
5. In `src/App.tsx` den `basename` des Routers entsprechend anpassen
6. Bei jedem Push auf `main` baut GitHub Actions das Projekt automatisch und
   veröffentlicht es auf GitHub Pages

## Rollen im Detail

| Rolle | Darf |
|---|---|
| `employee` | Wiki lesen, suchen, Feedback geben, Probleme melden |
| `technician` | zusätzlich: Bereiche/Stationen/Anleitungen erstellen und bearbeiten |
| `admin` | zusätzlich: Anleitungen löschen, vollständiger Zugriff |

Die Berechtigungen werden **in der Datenbank** über Row Level Security
durchgesetzt, nicht nur im Frontend versteckt.
