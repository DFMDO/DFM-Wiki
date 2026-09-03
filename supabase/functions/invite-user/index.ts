// Edge Function: invite-user
// Läuft sicher auf Supabase-Servern, NICHT im Browser.
// Der service_role-Schlüssel wird nur hier verwendet, niemals an die App weitergegeben.
//
// Prüft zuerst, ob der aufrufende Benutzer eingeloggt und Admin ist,
// bevor eine Einladung verschickt wird.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client im Namen des aufrufenden Benutzers, um dessen Rolle zu prüfen
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const {
      data: { user }
    } = await callerClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profile } = await callerClient.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Nur Admins dürfen Benutzer einladen.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'E-Mail-Adresse fehlt.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin-Client mit dem service_role-Schlüssel — ausschließlich hier, serverseitig
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
