import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { addRecentlyViewed } from '../lib/recentlyViewed'
import { logActivity } from '../lib/activity'
import { GuideContent } from '../components/GuideContent'
import { Lightbox } from '../components/Lightbox'
import { printGuide } from '../lib/printGuide'
import { slugify } from '../lib/slug'
import type { Guide } from '../types/database'

interface MediaItem {
  id: string
  url: string
  fileType: string | null
}

interface TagItem {
  id: string
  name: string
}

interface RelatedGuide {
  id: string
  title: string
}

export function GuideDetail() {
  const { guideId } = useParams()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [related, setRelated] = useState<RelatedGuide[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showPdfViewer, setShowPdfViewer] = useState(true)
  const [loading, setLoading] = useState(true)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showProblemForm, setShowProblemForm] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [problemTitle, setProblemTitle] = useState('')
  const [problemDesc, setProblemDesc] = useState('')
  const [problemPhoto, setProblemPhoto] = useState<File | null>(null)
  const [problemPhotoPreview, setProblemPhotoPreview] = useState<string | null>(null)
  const [submittingProblem, setSubmittingProblem] = useState(false)

  const canEdit = profile?.role === 'admin' || profile?.role === 'technician'
  const canDelete = profile?.role === 'admin'
  const { showToast } = useToast()

  useEffect(() => {
    async function load() {
      if (!guideId) return
      const { data } = await supabase.from('guides').select('*').eq('id', guideId).single()
      setGuide(data)
      setLoading(false)
      if (data) {
        await supabase.from('guides').update({ view_count: data.view_count + 1 }).eq('id', guideId)
        addRecentlyViewed(data.id, data.title)
      }

      const { data: mediaRows } = await supabase
        .from('media')
        .select('id, storage_path, file_type')
        .eq('guide_id', guideId)
      setMedia(
        (mediaRows ?? []).map((m) => ({
          id: m.id,
          fileType: m.file_type,
          url: supabase.storage.from('guide-images').getPublicUrl(m.storage_path).data.publicUrl
        }))
      )

      const { data: tagRows } = await supabase
        .from('guide_tags')
        .select('tags(id, name)')
        .eq('guide_id', guideId)
      setTags((tagRows ?? []).map((t: any) => t.tags).filter(Boolean))

      if (data) {
        const { data: relatedRows } = await supabase
          .from('guides')
          .select('id, title')
          .eq('station_id', data.station_id)
          .eq('status', 'published')
          .neq('id', guideId)
          .limit(4)
        setRelated(relatedRows ?? [])
      }

      if (user) {
        const { data: fav } = await supabase
          .from('favorites')
          .select('guide_id')
          .eq('guide_id', guideId)
          .eq('user_id', user.id)
          .maybeSingle()
        setIsFavorite(!!fav)
      }
    }
    load()
  }, [guideId, user])

  async function toggleFavorite() {
    if (!guideId || !user) return
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('guide_id', guideId).eq('user_id', user.id)
    } else {
      await supabase.from('favorites').insert({ guide_id: guideId, user_id: user.id })
    }
    setIsFavorite(!isFavorite)
  }

  async function handlePrint() {
    if (!guide) return
    const { data: station } = await supabase
      .from('stations')
      .select('name, areas(name)')
      .eq('id', guide.station_id)
      .single()
    printGuide({
      title: guide.title,
      summary: guide.summary,
      areaName: (station as any)?.areas?.name,
      stationName: station?.name,
      content: guide.content,
      tags: tags.map((t) => t.name),
      imageUrls: media.filter((m) => !m.fileType?.startsWith('video/')).map((m) => m.url),
      referenceUrl: guide.reference_url,
      referenceLabel: guide.reference_label,
      logoDataUrl: `${window.location.origin}${import.meta.env.BASE_URL}logo.png`
    })
  }

  async function shareGuide() {
    if (!guide) return
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: guide.title, url })
      } catch {
        // Nutzer hat abgebrochen -> nichts weiter tun
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        showToast('🔗 Link kopiert')
      } catch {
        showToast('Konnte den Link nicht kopieren')
      }
    }
  }

  // Praktisch für ähnliche Stationen mit demselben Aufbau (z.B. mehrere
  // Pandoras-Box-Rechner): Text, Tags und Dokument werden übernommen, Fotos
  // müssen bewusst neu hochgeladen werden (sie gehören zur jeweiligen Station).
  async function duplicateGuide() {
    if (!guide) return
    setDuplicating(true)
    const newTitle = `${guide.title} (Kopie)`
    const { data, error } = await supabase
      .from('guides')
      .insert({
        station_id: guide.station_id,
        title: newTitle,
        slug: `${slugify(newTitle)}-${Date.now().toString(36)}`,
        summary: guide.summary,
        content: guide.content,
        status: 'draft',
        reference_url: guide.reference_url,
        reference_label: guide.reference_label,
        author_id: user?.id
      })
      .select()
      .single()
    if (error || !data) {
      showToast('Duplizieren fehlgeschlagen')
      setDuplicating(false)
      return
    }
    if (tags.length > 0) {
      await supabase.from('guide_tags').insert(tags.map((t) => ({ guide_id: data.id, tag_id: t.id })))
    }
    await logActivity(user?.id, 'create', 'guide', data.id, `hat „${newTitle}" als Kopie von „${guide.title}" erstellt`)
    setDuplicating(false)
    showToast('📄 Kopie erstellt — Fotos bitte für die neue Station erneut hochladen')
    navigate(`/guides/${data.id}/edit`)
  }

  async function deleteGuide() {
    if (!guide || !guideId) return
    if (!confirm(`„${guide.title}" wirklich unwiderruflich löschen? Das kann nicht rückgängig gemacht werden.`)) return

    const { data: mediaRows } = await supabase.from('media').select('storage_path').eq('guide_id', guideId)
    if (mediaRows && mediaRows.length > 0) {
      await supabase.storage.from('guide-images').remove(mediaRows.map((m) => m.storage_path))
    }

    await supabase.from('guides').delete().eq('id', guideId)
    await logActivity(user?.id, 'delete', 'guide', guideId, `hat „${guide.title}" gelöscht`)
    showToast('🗑️ Anleitung gelöscht')
    navigate(`/stations/${guide.station_id}`)
  }

  const [showNegativeFeedbackForm, setShowNegativeFeedbackForm] = useState(false)
  const [negativeFeedbackComment, setNegativeFeedbackComment] = useState('')

  async function sendFeedback(helpful: boolean, comment?: string) {
    if (!guideId || !user) return
    if (helpful === false && comment === undefined) {
      setShowNegativeFeedbackForm(true)
      return
    }
    await supabase.from('feedback').insert({ guide_id: guideId, user_id: user.id, helpful, comment: comment || null })
    setFeedbackGiven(true)
    setShowNegativeFeedbackForm(false)
  }

  function handleProblemPhoto(file: File | null) {
    setProblemPhoto(file)
    setProblemPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function submitProblem() {
    if (!guideId || !user || !problemTitle.trim()) return
    setSubmittingProblem(true)

    let imageUrl: string | null = null
    if (problemPhoto) {
      const ext = problemPhoto.name.split('.').pop() || 'jpg'
      const path = `problem-reports/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('guide-images').upload(path, problemPhoto)
      if (!uploadError) {
        imageUrl = supabase.storage.from('guide-images').getPublicUrl(path).data.publicUrl
      }
    }

    await supabase.from('problem_reports').insert({
      guide_id: guideId,
      reported_by: user.id,
      title: problemTitle.trim(),
      description: problemDesc.trim(),
      image_url: imageUrl
    })
    setShowProblemForm(false)
    setProblemTitle('')
    setProblemDesc('')
    handleProblemPhoto(null)
    setSubmittingProblem(false)
  }

  if (loading) return <p className="text-neutral-500 text-sm">Lädt …</p>
  if (!guide) return <p className="text-neutral-500 text-sm">Anleitung nicht gefunden.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="text-xs text-neutral-500 hover:text-neutral-300">
          ← Zurück
        </button>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={handlePrint}
            className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
            title="Drucken / als PDF speichern"
          >
            🖨️ Drucken
          </button>
          <button
            onClick={shareGuide}
            className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
            title="Link teilen"
          >
            🔗 Teilen
          </button>
          <button
            onClick={toggleFavorite}
            className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
            title={isFavorite ? 'Favorit entfernen' : 'Zu Favoriten hinzufügen'}
          >
            {isFavorite ? '★ Favorit' : '☆ Favorit'}
          </button>
          {canEdit && (
            <div className="flex gap-2 flex-wrap justify-end">
              <Link
                to={`/guides/${guide.id}/versions`}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
              >
                Verlauf
              </Link>
              <Link
                to={`/guides/${guide.id}/qr`}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
              >
                QR-Code
              </Link>
              <Link
                to={`/guides/${guide.id}/edit`}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
              >
                Bearbeiten
              </Link>
              <button
                onClick={duplicateGuide}
                disabled={duplicating}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg"
                title="Als Vorlage für eine ähnliche Anleitung/Station nutzen"
              >
                {duplicating ? '…' : '📄 Duplizieren'}
              </button>
              {canDelete && (
                <button
                  onClick={deleteGuide}
                  className="text-sm bg-red-950 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg"
                >
                  🗑️ Löschen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">{guide.title}</h1>
      <p className="text-xs text-neutral-500 mb-2">
        ⏱ ca. {Math.max(1, Math.round(guide.content.trim().split(/\s+/).filter(Boolean).length / 200))} Min. Lesezeit
      </p>
      {guide.summary && <p className="text-neutral-400 mb-3">{guide.summary}</p>}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map((t) => (
            <span key={t.id} className="text-xs bg-neutral-800 border border-neutral-700 px-2 py-1 rounded-full text-neutral-400">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {guide.reference_url && (
        <div className="mb-4 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
            <span className="text-xl shrink-0">
              {guide.reference_url.toLowerCase().endsWith('.pdf') ? '📄' : '📎'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{guide.reference_label || 'Weiterführendes Dokument'}</p>
              <p className="text-xs text-neutral-500">Original-Dokument</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={guide.reference_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1.5 rounded-lg font-bold"
                title="In neuem Tab öffnen"
              >
                ⧉ Öffnen
              </a>
              {guide.reference_url.toLowerCase().endsWith('.pdf') && (
                <button
                  onClick={() => setShowPdfViewer((v) => !v)}
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1.5 rounded-lg font-bold"
                >
                  {showPdfViewer ? '▲ Einklappen' : '▼ PDF anzeigen'}
                </button>
              )}
            </div>
          </div>
          {showPdfViewer && guide.reference_url.toLowerCase().endsWith('.pdf') && (
            <iframe
              src={guide.reference_url}
              title="Original-PDF"
              className="w-full border-t border-neutral-800"
              style={{ height: '75vh' }}
            />
          )}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <GuideContent content={guide.content} media={media} />
      </div>

      {media.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mt-4 mb-2">
            Alle Fotos/Videos dieser Anleitung — die Nummer entspricht "[Bild N]" im Text:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {media.map((m, idx) =>
              m.fileType?.startsWith('video/') ? (
                <div key={m.id} className="relative">
                  <video
                    src={m.url}
                    controls
                    muted
                    playsInline
                    className="w-full aspect-square object-cover rounded-lg bg-black"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>
                </div>
              ) : (
                <button key={m.id} onClick={() => setLightboxSrc(m.url)} className="relative block">
                  <img src={m.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-neutral-400 mb-3">🔗 Ähnliche Anleitungen</h2>
          <div className="flex flex-col gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/guides/${r.id}`}
                className="card-hover block bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-bold"
              >
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        {!feedbackGiven ? (
          <>
            <p className="text-sm text-neutral-400 mb-2">Hat dir diese Anleitung geholfen?</p>
            {!showNegativeFeedbackForm ? (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => sendFeedback(true)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg"
                >
                  👍 Ja
                </button>
                <button
                  onClick={() => sendFeedback(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg"
                >
                  👎 Nein
                </button>
              </div>
            ) : (
              <div className="text-left max-w-sm mx-auto">
                <label className="block text-xs text-neutral-400 mb-1">Was hat nicht funktioniert?</label>
                <textarea
                  value={negativeFeedbackComment}
                  onChange={(e) => setNegativeFeedbackComment(e.target.value)}
                  className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm min-h-[70px]"
                  autoFocus
                />
                <button
                  onClick={() => sendFeedback(false, negativeFeedbackComment.trim())}
                  className="w-full py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm"
                >
                  Absenden
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-green-400">Danke für dein Feedback!</p>
        )}
      </div>

      <div className="mt-6 text-center">
        {!showProblemForm ? (
          <button
            onClick={() => setShowProblemForm(true)}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            🐞 Problem mit dieser Anleitung melden
          </button>
        ) : (
          <div className="text-left bg-neutral-900 border border-neutral-800 rounded-xl p-4 mt-3">
            <label className="block text-xs text-neutral-400 mb-1">Problem</label>
            <input
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            />
            <label className="block text-xs text-neutral-400 mb-1">Beschreibung</label>
            <textarea
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm min-h-[80px]"
            />

            <label className="block text-xs text-neutral-400 mb-1">Foto (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="problemPhotoInput"
              className="hidden"
              onChange={(e) => handleProblemPhoto(e.target.files?.[0] ?? null)}
            />
            {!problemPhotoPreview ? (
              <button
                type="button"
                onClick={() => document.getElementById('problemPhotoInput')?.click()}
                className="w-full mb-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-bold"
              >
                📷 Foto hinzufügen
              </button>
            ) : (
              <div className="relative w-24 h-24 mb-3">
                <img src={problemPhotoPreview} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => handleProblemPhoto(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}

            <button
              onClick={submitProblem}
              disabled={submittingProblem}
              className="w-full py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm"
            >
              {submittingProblem ? 'Wird gemeldet …' : 'Problem melden'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
