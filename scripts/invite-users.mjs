// Einmaliges Skript, um mehrere Kollegen auf einmal per Supabase-Einladung anzulegen.
//
// WICHTIG: Dieses Skript NUR lokal auf deinem eigenen Rechner ausführen.
// Der service_role-Schlüssel darf niemals in GitHub, in die App oder sonst
// irgendwo öffentlich landen.
//
// Verwendung:
//   1. Node.js muss installiert sein (node -v zum Prüfen)
//   2. Im Projektordner: npm install @supabase/supabase-js
//   3. Ausführen mit gesetzten Umgebungsvariablen, z.B. im Terminal:
//
//      SUPABASE_URL=https://sgsfocdoeqbrsaucwaos.supabase.co \
//      SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key \
//      node scripts/invite-users.mjs
//
//   (Unter Windows/PowerShell stattdessen z.B.:
//      $env:SUPABASE_URL="https://..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/invite-users.mjs
//   )

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY als Umgebungsvariablen setzen (siehe Kommentar oben).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const emails = [
  'hani.alassal@fussballmuseum.de',
  'Sebastian.Hensel@fussballmuseum.de',
  'Malte.Korherr@fussballmuseum.de',
  'jasper.helmich@fussballmuseum.de',
  'julius.krum@fussballmuseum.de',
  'Roman.Schellenberg@fussballmuseum.de',
  'Sebastian.Anuth@fussballmuseum.de',
  'Sebastian.Richau@fussballmuseum.de'
]

for (const email of emails) {
  const { error } = await supabase.auth.admin.inviteUserByEmail(email)
  if (error) {
    console.error(`❌ ${email}: ${error.message}`)
  } else {
    console.log(`✅ Einladung gesendet an ${email}`)
  }
}

console.log('\nFertig. Jeder Kollege bekommt eine E-Mail und setzt dort sein eigenes Passwort.')
