import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressImageIfNeeded } from '../lib/imageCompression'

interface MediaItem {
  id: string
  storage_path: string
  alt_text: string | null
  file_type: string | null
  sort_order: number
  url: string
}

const MAX_VIDEO_MB = 100

interface MediaUploaderProps {
  guideId: string
  onInsert?: (index: number) => void
  onMediaChange?: (items: { id: string; url: string; fileType: string | null }[]) => void
}

export function MediaUploader({ guideId, onInsert, onMediaChange }: MediaUploaderProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadHint, setUploadHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  async function loadMedia() {
    const { data } = await supabase
      .from('media')
      .select('*')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    const withUrls = (data ?? []).map((m) => ({
      id: m.id,
      storage_path: m.storage_path,
      alt_text: m.alt_text,
      file_type: m.file_type,
      sort_order: m.sort_order ?? 0,
      url: supabase.storage.from('guide-images').getPublicUrl(m.storage_path).data.publicUrl
    }))
    setItems(withUrls)
    onMediaChange?.(withUrls.map((m) => ({ id: m.id, url: m.url, fileType: m.file_type })))
  }

  useEffect(() => {
    loadMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId])

  async function uploadOne(file: File, nextOrder: number) {
    const isVideo = file.type.startsWith('video/')
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`„${file.name}" ist größer als ${MAX_VIDEO_MB} MB und wurde übersprungen.`)
      return false
    }

    const uploadFile = isVideo ? file : await compressImageIfNeeded(file)
    const ext = uploadFile.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
    const path = `${guideId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('guide-images').upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false
    })
    if (uploadError) {
      setError(uploadError.message)
      return false
    }
    await supabase.from('media').insert({
      guide_id: guideId,
      storage_path: path,
      file_type: uploadFile.type,
      uploaded_by: user?.id,
      sort_order: nextOrder
    })
    return true
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    const fileArray = Array.from(files)
    let nextOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const isVideo = file.type.startsWith('video/')
      setUploadHint(
        isVideo
          ? `Video ${i + 1} von ${fileArray.length} wird hochgeladen — kann bei größeren Dateien etwas dauern …`
          : `Foto ${i + 1} von ${fileArray.length} wird hochgeladen …`
      )
      const ok = await uploadOne(file, nextOrder)
      if (ok) nextOrder++
    }
    setUploading(false)
    setUploadHint(null)
    loadMedia()
  }

  async function handleDelete(item: MediaItem) {
    await supabase.storage.from('guide-images').remove([item.storage_path])
    await supabase.from('media').delete().eq('id', item.id)
    loadMedia()
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    await Promise.all([
      supabase.from('media').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('media').update({ sort_order: a.sort_order }).eq('id', b.id)
    ])
    loadMedia()
  }

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1">Fotos &amp; Videos</label>
      <input
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        id="mediaFileInput"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {/* Eigener, kamera-optimierter Eingang für schnelle Einzelaufnahmen vor Ort */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex gap-2 mb-1">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => document.getElementById('mediaFileInput')?.click()}
          className={`flex-1 px-4 py-4 border-2 border-dashed rounded-lg text-sm font-bold text-center cursor-pointer transition-colors ${
            dragActive ? 'border-accent bg-accent/10' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'
          }`}
        >
          {uploading ? 'Lädt hoch …' : '+ Foto oder Video hinzufügen (auch per Drag & Drop)'}
        </div>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          title="Foto direkt mit der Kamera aufnehmen"
          className="px-4 py-4 border-2 border-dashed border-neutral-700 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xl shrink-0"
        >
          📷
        </button>
      </div>
      <p className="text-[11px] text-neutral-500 mb-3">
        Fotos werden automatisch verkleinert, damit der Upload auch im Museums-WLAN schnell geht. Videos bis{' '}
        {MAX_VIDEO_MB} MB (MP4/MOV/WebM) — für längere Aufnahmen den Clip vorher kürzen.
      </p>

      {uploadHint && <p className="text-xs text-neutral-500 mb-3">{uploadHint}</p>}
      {error && <p className="text-sm text-accent mb-3">{error}</p>}

      {items.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-neutral-500">
            {reorderMode
              ? 'Reihenfolge per Pfeil-Buttons ändern.'
              : onInsert
                ? 'Auf ein Foto tippen, um es an der Cursor-Position im Text einzufügen.'
                : 'Nummer = Reihenfolge im Text'}
          </p>
          <button
            type="button"
            onClick={() => setReorderMode((v) => !v)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 underline shrink-0"
          >
            {reorderMode ? 'Fertig' : '🔀 Reihenfolge ändern'}
          </button>
        </div>
      )}

      {reorderMode ? (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const isVideo = item.file_type?.startsWith('video/')
            return (
              <div key={item.id} className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg p-2">
                <span className="text-xs font-bold text-neutral-400 w-5 text-center shrink-0">{idx + 1}</span>
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-black">
                  {isVideo ? (
                    <video src={item.url} muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-neutral-400 flex-1 truncate">{isVideo ? 'Video' : 'Foto'}</span>
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 font-bold shrink-0"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="w-7 h-7 rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 font-bold shrink-0"
                >
                  ▼
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, idx) => {
            const isVideo = item.file_type?.startsWith('video/')
            return (
              <div key={item.id} className="relative aspect-square group">
                {isVideo ? (
                  <video src={item.url} controls muted playsInline className="w-full h-full object-cover rounded-lg bg-black" />
                ) : (
                  <img src={item.url} alt={item.alt_text ?? ''} className="w-full h-full object-cover rounded-lg" />
                )}
                <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center"
                >
                  ×
                </button>
                {onInsert && (
                  <button
                    type="button"
                    onClick={() => onInsert(idx)}
                    className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-[11px] font-bold py-1 rounded-b-lg hover:bg-accent transition-colors"
                    style={{ zIndex: 2 }}
                  >
                    + Einfügen
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
