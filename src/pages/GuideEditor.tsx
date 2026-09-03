import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { MediaUploader } from '../components/MediaUploader'
import { DocumentUploader } from '../components/DocumentUploader'
import { GuideContent } from '../components/GuideContent'
import { logActivity } from '../lib/activity'
import { slugify } from '../lib/slug'
import type { GuideStatus } from '../types/database'

const calloutButtons = [
  { label: '⚠️ Warnung', tag: 'WARNUNG' },
  { label: '🛑 Gefahr', tag: 'GEFAHR' },
  { label: 'ℹ️ Info', tag: 'INFO' },
  { label: '💡 Tipp', tag: 'TIPP' },
  { label: '✅ Lösung', tag: 'LOESUNG' }
]

const CONTENT_TEMPLATE = `Problem:
Kurz beschreiben, wie sich der Fehler zeigt (was sieht/hört man).

Lösung:
1. Erster Schritt
2. Zweiter Schritt
3. Dritter Schritt

[!TIPP] Zusätzlicher Hinweis, z.B. wo Ersatzteile liegen oder wer sonst helfen kann`

interface Tag {
  id: string
  name: string
}

interface PreviewMediaItem {
  id: string
  url: string
  fileType: string | null
}

// Kleine Sektions-Karte für ein einheitliches, aufgeräumtes Formular-Layout
function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
      <h2 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}

export function GuideEditor() {
  // Entweder stationId (neue Anleitung) oder guideId (bearbeiten) ist gesetzt
  const { stationId, guideId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<GuideStatus>('draft')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [referenceLabel, setReferenceLabel] = useState('')
  const [resolvedStationId, setResolvedStationId] = useState<string | undefined>(stationId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')

  const [previewMedia, setPreviewMedia] = useState<PreviewMediaItem[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [dirty, setDirty] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorPos = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  function rememberCursor() {
    cursorPos.current = textareaRef.current?.selectionStart ?? null
  }

  useEffect(() => {
    async function load() {
      const { data: tagData } = await supabase.from('tags').select('*').order('name')
      setAllTags(tagData ?? [])

      if (!guideId) return
      const { data } = await supabase.from('guides').select('*').eq('id', guideId).single()
      if (data) {
        setTitle(data.title)
        setSummary(data.summary ?? '')
        setContent(data.content)
        setStatus(data.status)
        setReferenceUrl(data.reference_url ?? '')
        setReferenceLabel(data.reference_label ?? '')
        setResolvedStationId(data.station_id)
      }

      const { data: tagRows } = await supabase.from('guide_tags').select('tag_id').eq('guide_id', guideId)
      setSelectedTagIds((tagRows ?? []).map((t) => t.tag_id))
      initializedRef.current = true
    }
    load()
  }, [guideId])

  // Schützt vor versehentlichem Datenverlust, wenn der Tab geschlossen oder neu
  // geladen wird, während noch ungespeicherte Änderungen vorliegen.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Strg/Cmd+S speichert direkt, ohne dass man erst zum Button scrollen muss.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, content, status, referenceUrl, referenceLabel, selectedTagIds])

  function markDirty() {
    if (initializedRef.current) setDirty(true)
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
    markDirty()
  }

  async function addNewTag() {
    const name = newTagName.trim()
    if (!name) return
    const { data, error: tagError } = await supabase
      .from('tags')
      .upsert({ name }, { onConflict: 'name' })
      .select()
      .single()
    if (!tagError && data) {
      setAllTags((prev) => (prev.some((t) => t.id === data.id) ? prev : [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'de'))))
      setSelectedTagIds((prev) => (prev.includes(data.id) ? prev : [...prev, data.id]))
    }
    setNewTagName('')
  }

  // Gemeinsame Hilfsfunktion: fügt einen Textblock genau an der zuletzt im Textfeld
  // angeklickten Stelle ein (statt immer nur ans Ende anzuhängen).
  function insertBlockAtCursor(block: string) {
    markDirty()
    setContent((prev) => {
      const pos = cursorPos.current ?? prev.length
      const before = prev.slice(0, pos)
      const after = prev.slice(pos)
      const leadingBreak = before.trim() && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
      const trailingBreak = after.trim() && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
      const insertion = `${leadingBreak}${block}${trailingBreak || (after.trim() ? '' : '\n\n')}`
      const next = `${before}${insertion}${after}`
      const newPos = before.length + insertion.length
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(newPos, newPos)
        cursorPos.current = newPos
      })
      return next
    })
  }

  function insertCallout(tag: string) {
    insertBlockAtCursor(`[!${tag}] `)
  }

  // Fügt ein Foto/Video an der zuletzt im Textfeld angeklickten Stelle ein —
  // Kolleg:innen müssen die [Bild N]-Schreibweise nicht mehr selbst tippen,
  // ein Klick auf das Vorschaubild unten reicht.
  function insertImageTag(index: number) {
    insertBlockAtCursor(`[Bild ${index + 1}]`)
    showToast(`🖼️ Foto ${index + 1} eingefügt`)
  }

  function insertStepsTemplate() {
    insertBlockAtCursor('1. Schritt eins\n2. Schritt zwei\n3. Schritt drei')
    showToast('🔢 Schritte eingefügt — jetzt anpassen')
  }

  function loadFullTemplate() {
    if (content.trim() && !confirm('Vorhandenen Inhalt durch die Vorlage ersetzen?')) return
    setContent(CONTENT_TEMPLATE)
    markDirty()
    showToast('📋 Vorlage eingefügt')
  }

  async function syncTags(targetGuideId: string) {
    await supabase.from('guide_tags').delete().eq('guide_id', targetGuideId)
    if (selectedTagIds.length > 0) {
      await supabase.from('guide_tags').insert(selectedTagIds.map((tagId) => ({ guide_id: targetGuideId, tag_id: tagId })))
    }
  }

  async function handleSave() {
    if (!title.trim() || !resolvedStationId) {
      setError('Bitte mindestens einen Titel eintragen.')
      return
    }
    setSaving(true)
    setError(null)

    if (guideId) {
      const { error: updateError } = await supabase
        .from('guides')
        .update({
          title,
          summary,
          content,
          status,
          reference_url: referenceUrl.trim() || null,
          reference_label: referenceLabel.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', guideId)
      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
      await supabase.from('guide_versions').insert({
        guide_id: guideId,
        editor_id: user?.id,
        content,
        change_description: 'Aktualisiert über den Editor'
      })
      await syncTags(guideId)
      await logActivity(user?.id, 'update', 'guide', guideId, `hat „${title}" bearbeitet`)
      setDirty(false)
      showToast('✅ Anleitung gespeichert')
      navigate(`/guides/${guideId}`)
    } else {
      const { data, error: insertError } = await supabase
        .from('guides')
        .insert({
          station_id: resolvedStationId,
          title,
          slug: slugify(title),
          summary,
          content,
          status,
          reference_url: referenceUrl.trim() || null,
          reference_label: referenceLabel.trim() || null,
          author_id: user?.id
        })
        .select()
        .single()
      if (insertError || !data) {
        setError(insertError?.message ?? 'Unbekannter Fehler beim Speichern.')
        setSaving(false)
        return
      }
      await syncTags(data.id)
      await logActivity(user?.id, 'create', 'guide', data.id, `hat die Anleitung „${title}" erstellt`)
      setDirty(false)
      showToast('✅ Anleitung erstellt')
      navigate(`/guides/${data.id}`)
    }
    setSaving(false)
  }

  // Vollständigkeits-Check — motiviert dazu, eine wirklich hilfreiche Anleitung
  // zu schreiben, ohne dass irgendetwas zur Pflicht gemacht wird.
  const checklist = [
    { label: 'Titel', done: title.trim().length > 0 },
    { label: 'Kurzbeschreibung', done: summary.trim().length > 0 },
    { label: 'Ausführlicher Inhalt', done: content.trim().length > 40 },
    { label: 'Mind. 1 Foto/Video', done: previewMedia.length > 0 },
    { label: 'Mind. 1 Tag', done: selectedTagIds.length > 0 }
  ]
  const doneCount = checklist.filter((c) => c.done).length

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{guideId ? 'Anleitung bearbeiten' : 'Neue Anleitung'}</h1>
      <p className="text-xs text-neutral-500 mb-4">
        Am besten so schreiben, dass eine Kollegin oder ein Kollege ohne Vorwissen dem Problem folgen kann.
      </p>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400">Wie vollständig ist die Anleitung?</span>
          <span className="text-xs text-neutral-500">
            {doneCount} / {checklist.length}
          </span>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(doneCount / checklist.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {checklist.map((c) => (
            <span
              key={c.label}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                c.done ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
              }`}
            >
              {c.done ? '✅' : '⚪'} {c.label}
            </span>
          ))}
        </div>
        {doneCount === checklist.length && (
          <p className="text-xs text-green-400 mt-2">🎉 Sieht vollständig aus — bereit zum Veröffentlichen!</p>
        )}
      </div>

      <Section icon="📝" title="Basisdaten">
        <label className="block text-xs text-neutral-400 mb-1">Titel</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            markDirty()
          }}
          placeholder="Kurz und konkret, z.B. „Bildschirm bleibt schwarz“"
          className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        />

        <label className="block text-xs text-neutral-400 mb-1">Kurzbeschreibung</label>
        <input
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value)
            markDirty()
          }}
          placeholder="Ein Satz, der in der Liste unter dem Titel steht"
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        />
      </Section>

      <Section icon="🛠️" title="Inhalt">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {calloutButtons.map((c) => (
            <button
              key={c.tag}
              type="button"
              onClick={() => insertCallout(c.tag)}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1.5 rounded-lg"
            >
              {c.label}
            </button>
          ))}
          <span className="w-px bg-neutral-700 mx-0.5" />
          <button
            type="button"
            onClick={insertStepsTemplate}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1.5 rounded-lg"
          >
            🔢 Schritte
          </button>
          <button
            type="button"
            onClick={loadFullTemplate}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1.5 rounded-lg"
          >
            📋 Ganze Vorlage laden
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            markDirty()
          }}
          onClick={rememberCursor}
          onKeyUp={rememberCursor}
          onSelect={rememberCursor}
          className="w-full mb-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm min-h-[240px]"
          placeholder={'Problem:\n...\n\nLösung:\n1. ...\n2. ...\n\n[!TIPP] Ersatzteil liegt im Lager B3'}
        />
        <p className="text-[11px] text-neutral-500 mb-3">
          Tipp: Ein Absatz, der mit z.B. [!WARNUNG] beginnt, wird als farbige Hinweisbox angezeigt — nutze dafür die
          Buttons oben. Fotos/Videos lassen sich weiter unten hochladen und mit einem Klick genau an der Stelle
          einfügen, an der zuletzt im Text geklickt wurde.
        </p>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1.5 rounded-lg font-bold"
        >
          {showPreview ? '✏️ Vorschau ausblenden' : '👁️ Live-Vorschau anzeigen'}
        </button>
        {showPreview && (
          <div className="mt-3 bg-neutral-950/40 border border-neutral-800 rounded-lg p-4">
            <p className="text-[11px] text-neutral-500 mb-3">
              So sieht die Anleitung später aus (Bilder erscheinen erst, sobald sie unten hochgeladen sind):
            </p>
            <GuideContent content={content} media={previewMedia} />
          </div>
        )}
      </Section>

      <Section icon="📸" title="Fotos & Videos">
        {guideId ? (
          <MediaUploader guideId={guideId} onInsert={insertImageTag} onMediaChange={setPreviewMedia} />
        ) : (
          <p className="text-xs text-neutral-500">Fotos lassen sich hinzufügen, sobald die Anleitung einmal gespeichert wurde.</p>
        )}
      </Section>

      <Section icon="📄" title="Dokument (z.B. PDF-Handbuch)">
        {guideId ? (
          <DocumentUploader
            guideId={guideId}
            url={referenceUrl}
            label={referenceLabel}
            onChange={(url, label) => {
              setReferenceUrl(url)
              setReferenceLabel(label)
              markDirty()
            }}
          />
        ) : (
          <p className="text-xs text-neutral-500">Dokumente lassen sich hinzufügen, sobald die Anleitung einmal gespeichert wurde.</p>
        )}
      </Section>

      <Section icon="🏷️" title="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
            placeholder="Neuen Tag hinzufügen …"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          />
          <button
            type="button"
            onClick={addNewTag}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-bold"
          >
            + Hinzufügen
          </button>
        </div>
      </Section>

      <Section icon="🚦" title="Status">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as GuideStatus)
            markDirty()
          }}
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        >
          <option value="draft">Entwurf (nur für Techniker/Admins sichtbar)</option>
          <option value="published">Veröffentlicht (für alle sichtbar)</option>
          <option value="archived">Archiviert</option>
        </select>
      </Section>

      {error && <p className="text-sm text-accent mb-4">{error}</p>}

      <div className="sticky bottom-3 z-10">
        {dirty && (
          <p className="text-center text-[11px] text-neutral-400 bg-neutral-900/90 border border-neutral-800 rounded-t-lg py-1">
            ● Ungespeicherte Änderungen
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm shadow-lg shadow-black/40"
        >
          {saving ? 'Speichert …' : '💾 Speichern (Strg+S)'}
        </button>
      </div>
    </div>
  )
}
