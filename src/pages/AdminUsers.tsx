import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { logActivity } from '../lib/activity'
import type { Profile, Role } from '../types/database'

export function AdminUsers() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function changeRole(id: string, role: Role, name: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    await logActivity(user?.id, 'update', 'user', id, `hat die Rolle von ${name} auf „${role}" geändert`)
    loadUsers()
  }

  function startEditName(u: Profile) {
    setEditingId(u.id)
    setNameDraft(u.full_name || '')
  }

  async function saveName(id: string) {
    await supabase.from('profiles').update({ full_name: nameDraft.trim() || null }).eq('id', id)
    setEditingId(null)
    loadUsers()
  }

  async function handleInvite() {
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    const { data, error } = await supabase.functions.invoke('invite-user', { body: { email } })

    if (error || data?.error) {
      showToast(`❌ ${data?.error || error?.message || 'Einladung fehlgeschlagen'}`)
    } else {
      showToast(`✅ Einladung an ${email} verschickt`)
      await logActivity(user?.id, 'create', 'user', null, `hat ${email} eingeladen`)
      setInviteEmail('')
    }
    setInviting(false)
  }

  return (
    <div>
      <Link to="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Verwaltung
      </Link>
      <h1 className="text-xl font-bold mb-6">Benutzerverwaltung</h1>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
        <label className="block text-xs text-neutral-400 mb-1">Neuen Kollegen einladen</label>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            type="email"
            placeholder="vorname.nachname@fussballmuseum.de"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {inviting ? 'Sendet …' : '✉️ Einladen'}
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 mt-2">
          Der Kollege bekommt eine E-Mail und legt dort selbst sein Passwort fest — kein gemeinsames Passwort nötig.
        </p>
      </div>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="min-w-0">
              {editingId === u.id ? (
                <div className="flex gap-2 items-center mb-1">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Vollständiger Name"
                    autoFocus
                    className="px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
                  />
                  <button
                    onClick={() => saveName(u.id)}
                    className="text-xs bg-accent hover:bg-accent-dark px-2 py-1 rounded-lg font-bold"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded-lg"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-bold truncate">{u.full_name || '(Kein Name hinterlegt)'}</div>
                  <button
                    onClick={() => startEditName(u)}
                    className="text-xs text-neutral-500 hover:text-neutral-300 underline shrink-0"
                  >
                    bearbeiten
                  </button>
                </div>
              )}
              <div className="text-xs text-neutral-500">{u.email}</div>
              {u.last_login && (
                <div className="text-xs text-neutral-600">
                  Letzter Login: {new Date(u.last_login).toLocaleDateString('de-DE')}
                </div>
              )}
            </div>
            <select
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value as Role, u.full_name || u.email || 'Benutzer')}
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            >
              <option value="employee">Mitarbeiter</option>
              <option value="technician">Techniker</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>

      {!loading && users.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-16">Keine Benutzer gefunden.</p>
      )}
    </div>
  )
}
