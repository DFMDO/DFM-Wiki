import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface LogRow {
  id: string
  action: string
  entity_type: string | null
  description: string
  created_at: string
  user_name: string
}

const actionLabel: Record<string, string> = {
  create: '✨',
  update: '✏️',
  delete: '🗑️',
  restore: '↩️'
}

export function ActivityLog() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, description, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs(
        (data ?? []).map((l: any) => ({
          id: l.id,
          action: l.action,
          entity_type: l.entity_type,
          description: l.description,
          created_at: l.created_at,
          user_name: l.profiles?.full_name || l.profiles?.email || 'Unbekannt'
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <Link to="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Verwaltung
      </Link>
      <h1 className="text-xl font-bold mb-6">Aktivitätsprotokoll</h1>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-2">
        {logs.map((l) => (
          <div key={l.id} className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm flex gap-3">
            <span>{actionLabel[l.action] ?? '•'}</span>
            <div>
              <span className="font-bold">{l.user_name}</span> {l.description}
              <div className="text-xs text-neutral-500">
                {new Date(l.created_at).toLocaleDateString('de-DE')}{' '}
                {new Date(l.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && logs.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-16">Noch keine Aktivitäten protokolliert.</p>
      )}
    </div>
  )
}
