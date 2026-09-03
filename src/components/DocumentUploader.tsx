import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pdfjsLib } from '../lib/pdfWorker'

const MAX_DOC_MB = 25

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function filenameToLabel(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ')
}

// Rendert die erste Seite einer PDF als kleines Vorschaubild, damit man auf einen
// Blick sieht, was hochgeladen wurde — ohne die Datei erst öffnen zu müssen.
async function renderFirstPageThumbnail(source: File | string): Promise<string | null> {
  try {
    const loadingTask =
      typeof source === 'string' ? pdfjsLib.getDocument({ url: source }) : pdfjsLib.getDocument({ data: await source.arrayBuffer() })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.6 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}


interface DocumentUploaderProps {
  guideId: string
  url: string
  label: string
  onChange: (url: string, label: string) => void
}

// Lässt Kolleg:innen ein PDF/Dokument direkt per Klick oder Drag & Drop hochladen —
// kein Umweg mehr über externes Hosting + Link-Einfügen nötig. Das Dokument wird
// sofort in der Anleitung eingebettet angezeigt (siehe GuideDetail).
export function DocumentUploader({ guideId, url, label, onChange }: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLinkFields, setShowLinkFields] = useState(false)
  const [preview, setPreview] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [thumbLoading, setThumbLoading] = useState(false)
  const [docSize, setDocSize] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isPdf = url.toLowerCase().endsWith('.pdf')

  // Thumbnail für bereits gespeicherte PDFs nachladen (z.B. beim erneuten Öffnen der Anleitung)
  useEffect(() => {
    if (!url || !isPdf) {
      setThumbnail(null)
      return
    }
    let cancelled = false
    setThumbLoading(true)
    renderFirstPageThumbnail(url).then((thumb) => {
      if (!cancelled) {
        setThumbnail(thumb)
        setThumbLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  async function handleFile(file: File | null) {
    if (!file) return
    setError(null)

    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setError(`„${file.name}" ist größer als ${MAX_DOC_MB} MB. Bitte vorher verkleinern.`)
      return
    }

    setUploading(true)
    setDocSize(file.size)
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      renderFirstPageThumbnail(file).then(setThumbnail)
    }

    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${guideId}/reference/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('guide-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const publicUrl = supabase.storage.from('guide-images').getPublicUrl(path).data.publicUrl
    onChange(publicUrl, filenameToLabel(file.name))
    setUploading(false)
  }

  function handleRemove() {
    onChange('', '')
    setPreview(false)
    setThumbnail(null)
    setDocSize(null)
  }

  const isUpload = url.includes('/storage/v1/object/public/guide-images/')

  if (url) {
    return (
      <div className="mb-1">
        <div className="flex items-center gap-3 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5">
          {isPdf ? (
            <div className="w-11 h-14 shrink-0 rounded bg-neutral-900 border border-neutral-700 overflow-hidden flex items-center justify-center">
              {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              ) : thumbLoading ? (
                <span className="text-[10px] text-neutral-600">…</span>
              ) : (
                <span className="text-lg">📄</span>
              )}
            </div>
          ) : (
            <span className="text-xl shrink-0">📎</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{label || 'Dokument'}</p>
            <p className="text-[11px] text-neutral-500 truncate">
              {docSize ? `${formatSize(docSize)} · ` : ''}
              {isUpload ? 'Hochgeladenes Dokument' : url}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {isPdf && (
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="text-xs bg-neutral-700 hover:bg-neutral-600 px-2 py-1.5 rounded-lg font-bold"
              >
                {preview ? 'Vorschau aus' : '👁️ Vorschau'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs bg-red-950 hover:bg-red-900 text-red-300 px-2 py-1.5 rounded-lg font-bold"
            >
              Entfernen
            </button>
          </div>
        </div>
        {preview && isPdf && (
          <iframe src={url} title="Dokument-Vorschau" className="w-full mt-2 rounded-lg border border-neutral-800" style={{ height: '50vh' }} />
        )}
        <label className="block text-xs text-neutral-400 mt-2 mb-1">Anzeigename (optional)</label>
        <input
          value={label}
          onChange={(e) => onChange(url, e.target.value)}
          placeholder="z.B. Notfall-Anleitung Audio-Gerät"
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        />
        {!isUpload && (
          <p className="text-[11px] text-neutral-500 mt-1">
            Externer Link — wird angezeigt, sofern es sich um eine PDF-Adresse handelt.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mb-1">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFile(e.dataTransfer.files?.[0] ?? null)
        }}
        onClick={() => inputRef.current?.click()}
        className={`px-4 py-5 border-2 border-dashed rounded-lg text-sm font-bold text-center cursor-pointer transition-colors ${
          dragActive ? 'border-accent bg-accent/10' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'
        }`}
      >
        {uploading ? 'Lädt hoch …' : '📄 PDF oder Dokument hochladen (auch per Drag & Drop)'}
      </div>
      <p className="text-[11px] text-neutral-500 mt-1.5">
        z.B. Herstellerhandbuch, Datenblatt oder Notfall-Anleitung — wird direkt in der Anleitung anzeigbar,
        kein separater Download nötig. Bis {MAX_DOC_MB} MB.
      </p>
      {error && <p className="text-sm text-accent mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => setShowLinkFields((v) => !v)}
        className="text-xs text-neutral-500 hover:text-neutral-300 mt-2 underline"
      >
        {showLinkFields ? 'Datei-Upload verwenden' : 'Stattdessen externen Link einfügen'}
      </button>
      {showLinkFields && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            value={label}
            onChange={(e) => onChange(url, e.target.value)}
            placeholder="Bezeichnung, z.B. Hersteller-Handbuch"
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          />
          <input
            value={url}
            onChange={(e) => onChange(e.target.value, label)}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          />
        </div>
      )}
    </div>
  )
}
