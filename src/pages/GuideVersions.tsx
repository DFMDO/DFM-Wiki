import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activity'
import type { Guide } from '../types/database'

interface VersionRow {
  id: string
  content: string
  change_description: string | null
  created_at: string
  editor_name: string
}

export function GuideVersions() {
  const { guideId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!guideId) return
    const { data: guideData } = await supabase.from('guides').select('*').eq('id', guideId).single()
    setGuide(guideData)

    const { data } = await supabase
      .from('guide_versions')
      .select('id, content, change_description, created_at, profiles(full_name, email)')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false })

    setVersions(
      (data ?? []).map((v: any) => ({
        id: v.id,
        content: v.content,
        change_description: v.change_description,
        created_at: v.created_at,
        editor_name: v.profiles?.full_name || v.profiles?.email || 'Unbekannt'
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId])

  async function restoreVersion(version: VersionRow) {
    if (!guideId || !guide) return
    if (!confirm('Diese Version wirklich wiederherstellen? Der aktuelle Inhalt wird dabei ersetzt.')) return

    await supabase
      .from('guides')
      .update({ content: version.content, updated_at: new Date().toISOString() })
      .eq('id', guideId)

    await supabase.from('guide_versions').insert({
      guide_id: guideId,
      editor_id: user?.id,
      content: version.content,
      change_description: `Wiederhergestellt aus Version vom ${new Date(version.created_at).toLocaleDateString('de-DE')}`
    })

    await logActivity(user?.id, 'restore', 'guide', guideId, `Version wiederhergestellt für „${guide.title}"`)

    navigate(`/guides/${guideId}`)
  }

  if (loading) return <p className="text-neutral-500 text-sm">Lädt …</p>

  return (
    <div>
      <Link to={`/guides/${guideId}`} className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Anleitung
      </Link>
      <h1 className="text-xl font-bold mb-6">Versionsverlauf{guide ? ` · ${guide.title}` : ''}</h1>

      <div className="flex flex-col gap-3">
        {versions.map((v) => (
          <div key={v.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="text-sm font-bold">
                  {new Date(v.created_at).toLocaleDateString('de-DE')}{' '}
                  {new Date(v.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-neutral-500">{v.editor_name}</div>
                {v.change_description && (
                  <div className="text-xs text-neutral-500 mt-1">„{v.change_description}"</div>
                )}
              </div>
              <button
                onClick={() => restoreVersion(v)}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap"
              >
                Wiederherstellen
              </button>
            </div>
            <div className="text-xs text-neutral-600 mt-2 line-clamp-2 whitespace-pre-wrap">{v.content}</div>
          </div>
        ))}
      </div>

      {versions.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-16">
          Noch keine gespeicherten Versionen. Beim nächsten Bearbeiten wird automatisch eine Version angelegt.
        </p>
      )}
    </div>
  )
}
