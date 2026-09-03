import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { logActivity } from '../lib/activity'
import { EmptyState } from '../components/EmptyState'

interface DraftRow {
  id: string
  title: string
  summary: string | null
  created_at: string
  station_name: string
  area_name: string
}

export function Drafts() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('guides')
      .select('id, title, summary, created_at, stations(name, areas(name))')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    setDrafts(
      (data ?? []).map((g: any) => ({
        id: g.id,
        title: g.title,
        summary: g.summary,
        created_at: g.created_at,
        station_name: g.stations?.name ?? 'Unbekannt',
        area_name: g.stations?.areas?.name ?? 'Unbekannt'
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function publish(id: string, title: string) {
    await supabase.from('guides').update({ status: 'published' }).eq('id', id)
    await logActivity(user?.id, 'update', 'guide', id, `hat „${title}" veröffentlicht`)
    showToast('✅ Veröffentlicht')
    load()
  }

  return (
    <div>
      <Link to="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Verwaltung
      </Link>
      <h1 className="text-xl font-bold mb-2">📝 Entwürfe</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Anleitungen, die noch nicht veröffentlicht sind (z.B. frisch importiert) und für Mitarbeiter noch nicht sichtbar.
      </p>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-2">
        {drafts.map((d) => (
          <div key={d.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <Link to={`/guides/${d.id}`} className="font-bold hover:text-accent">
                  {d.title}
                </Link>
                <div className="text-xs text-neutral-500">
                  {d.area_name} › {d.station_name} · {new Date(d.created_at).toLocaleDateString('de-DE')}
                </div>
                {d.summary && <div className="text-xs text-neutral-600 mt-1">{d.summary}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/guides/${d.id}/edit`}
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg font-bold"
                >
                  Bearbeiten
                </Link>
                <button
                  onClick={() => publish(d.id, d.title)}
                  className="text-xs bg-accent hover:bg-accent-dark px-3 py-1.5 rounded-lg font-bold"
                >
                  Veröffentlichen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && drafts.length === 0 && <EmptyState icon="📝" title="Keine offenen Entwürfe" />}
    </div>
  )
}
