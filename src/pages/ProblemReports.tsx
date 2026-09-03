import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activity'
import { EmptyState } from '../components/EmptyState'
import { Lightbox } from '../components/Lightbox'

type ReportStatus = 'open' | 'in_progress' | 'resolved'

interface ReportRow {
  id: string
  title: string
  description: string | null
  status: ReportStatus
  created_at: string
  guide_id: string | null
  guide_title: string
  reporter_name: string
  image_url: string | null
}

const statusLabel: Record<ReportStatus, { label: string; color: string }> = {
  open: { label: '🔴 Offen', color: 'text-red-400' },
  in_progress: { label: '🟡 In Bearbeitung', color: 'text-yellow-400' },
  resolved: { label: '🟢 Gelöst', color: 'text-green-400' }
}

export function ProblemReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('problem_reports')
      .select('id, title, description, status, created_at, guide_id, image_url, guides(title), profiles(full_name, email)')
      .order('created_at', { ascending: false })

    setReports(
      (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        created_at: r.created_at,
        guide_id: r.guide_id,
        guide_title: r.guides?.title ?? 'Unbekannte Anleitung',
        reporter_name: r.profiles?.full_name || r.profiles?.email || 'Unbekannt',
        image_url: r.image_url ?? null
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function changeStatus(id: string, status: ReportStatus, title: string) {
    await supabase.from('problem_reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await logActivity(user?.id, 'update', 'problem_report', id, `hat die Meldung „${title}" auf „${statusLabel[status].label}" gesetzt`)
    load()
  }

  return (
    <div>
      <Link to="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Verwaltung
      </Link>
      <h1 className="text-xl font-bold mb-6">🐞 Problemmeldungen</h1>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-neutral-500">
                  {r.guide_id ? (
                    <Link to={`/guides/${r.guide_id}`} className="hover:text-neutral-300">
                      {r.guide_title}
                    </Link>
                  ) : (
                    r.guide_title
                  )}
                  {' · '}
                  {r.reporter_name} ·{' '}
                  {new Date(r.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
              <select
                value={r.status}
                onChange={(e) => changeStatus(r.id, e.target.value as ReportStatus, r.title)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
              >
                <option value="open">🔴 Offen</option>
                <option value="in_progress">🟡 In Bearbeitung</option>
                <option value="resolved">🟢 Gelöst</option>
              </select>
            </div>
            {r.description && <p className="text-sm text-neutral-400 mt-2">{r.description}</p>}
            {r.image_url && (
              <button onClick={() => setLightboxSrc(r.image_url!)}>
                <img src={r.image_url} alt="" className="w-24 h-24 object-cover rounded-lg mt-2" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!loading && reports.length === 0 && (
        <EmptyState icon="🐞" title="Keine Problemmeldungen vorhanden" />
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
