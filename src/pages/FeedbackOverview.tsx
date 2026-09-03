import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/EmptyState'

interface FeedbackRow {
  id: string
  comment: string | null
  created_at: string
  guide_id: string
  guide_title: string
  user_name: string
}

export function FeedbackOverview() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('feedback')
        .select('id, comment, created_at, guide_id, guides(title), profiles(full_name, email)')
        .eq('helpful', false)
        .order('created_at', { ascending: false })
        .limit(100)

      setRows(
        (data ?? []).map((f: any) => ({
          id: f.id,
          comment: f.comment,
          created_at: f.created_at,
          guide_id: f.guide_id,
          guide_title: f.guides?.title ?? 'Unbekannte Anleitung',
          user_name: f.profiles?.full_name || f.profiles?.email || 'Unbekannt'
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
      <h1 className="text-xl font-bold mb-2">👎 Negatives Feedback</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Anleitungen, bei denen Mitarbeiter "hat nicht geholfen" angegeben haben — guter Ausgangspunkt zum Verbessern.
      </p>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <Link to={`/guides/${r.guide_id}`} className="font-bold hover:text-accent">
              {r.guide_title}
            </Link>
            <div className="text-xs text-neutral-500 mb-1">
              {r.user_name} · {new Date(r.created_at).toLocaleDateString('de-DE')}
            </div>
            {r.comment && <p className="text-sm text-neutral-300">„{r.comment}"</p>}
          </div>
        ))}
      </div>

      {!loading && rows.length === 0 && <EmptyState icon="👍" title="Kein negatives Feedback vorhanden" />}
    </div>
  )
}
