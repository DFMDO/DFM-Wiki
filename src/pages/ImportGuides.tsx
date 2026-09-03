import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { logActivity } from '../lib/activity'
import { suggestAreaIcon } from '../lib/icons'
import { extractTextFromPdf, extractTextFromDocx, extractTextFromPdfWithOcr } from '../lib/documentExtract'
import { ETAGEN } from '../lib/museumLocations'

function slugify(str: string) {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '') || 'anleitung'
  )
}

interface ParsedGuide {
  titel: string
  bereich: string
  station: string
  standort: string
  content: string
  originalFile?: File
  originalLabel?: string
  needsOcr?: boolean
  ocrRunning?: boolean
}

function filenameToTitle(filename: string) {
  return filename.replace(/\.(md|txt|pdf|docx?)$/i, '').replace(/[-_]/g, ' ')
}

function parseImportText(raw: string, defaultBereich: string, defaultStation: string): ParsedGuide[] {
  if (!raw.trim()) return []
  const blocks = raw.split(/\n-{3,}\n/)
  return blocks
    .map((block) => {
      const lines = block.split('\n')
      let idx = 0
      let titel = ''
      let bereich = defaultBereich
      let station = defaultStation
      let standort = ''
      let usedHeader = false

      while (idx < lines.length) {
        const m = lines[idx].match(/^(Titel|Bereich|Station|Standort):\s*(.*)$/i)
        if (!m) break
        usedHeader = true
        const key = m[1].toLowerCase()
        const val = m[2].trim()
        if (key === 'titel') titel = val
        else if (key === 'bereich') bereich = val || bereich
        else if (key === 'station') station = val || station
        else if (key === 'standort') standort = val
        idx++
      }
      while (lines[idx] === '') idx++

      let content: string
      if (usedHeader) {
        content = lines.slice(idx).join('\n').trim()
      } else {
        const firstNonEmptyIdx = lines.findIndex((l) => l.trim())
        titel = (lines[firstNonEmptyIdx] || 'Importierte Anleitung').trim().slice(0, 80)
        content = lines.slice(firstNonEmptyIdx + 1).join('\n').trim()
      }

      if (!titel) titel = 'Importierte Anleitung'
      return { titel, bereich, station, standort, content }
    })
    .filter((g) => g.content.length > 0 || g.titel !== 'Importierte Anleitung')
}

export function ImportGuides() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [rawText, setRawText] = useState('')
  const [defaultBereich, setDefaultBereich] = useState('')
  const [defaultStation, setDefaultStation] = useState('')
  const [filterEtage, setFilterEtage] = useState('')
  const [stationList, setStationList] = useState<{ id: string; name: string; location: string | null; areaName: string }[]>([])
  const [fileGuides, setFileGuides] = useState<ParsedGuide[]>([])
  const [parsing, setParsing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [parsed, setParsed] = useState<ParsedGuide[] | null>(null)
  const [publishDirectly, setPublishDirectly] = useState(false)

  useEffect(() => {
    async function loadStations() {
      const { data } = await supabase.from('stations').select('id, name, location, areas(name)')
      setStationList(
        (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.location,
          areaName: s.areas?.name ?? ''
        }))
      )
    }
    loadStations()
  }, [])

  const filteredStations = filterEtage
    ? stationList.filter((s) => (s.location || '').startsWith(filterEtage))
    : stationList

  function handleStationPick(stationId: string) {
    const station = stationList.find((s) => s.id === stationId)
    if (station) {
      setDefaultBereich(station.areaName)
      setDefaultStation(station.name)
    }
  }
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [resultSummary, setResultSummary] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    const textFiles = files.filter((f) => /\.(txt|md)$/i.test(f.name))
    const pdfFiles = files.filter((f) => /\.pdf$/i.test(f.name))
    const docxFiles = files.filter((f) => /\.docx$/i.test(f.name))

    // .txt / .md -> wie bisher in das Textfeld einfügen
    if (textFiles.length > 0) {
      const texts = await Promise.all(
        textFiles.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                let text = String(reader.result || '')
                if (!/^Titel:/im.test(text)) {
                  text = `Titel: ${filenameToTitle(file.name)}\n\n${text}`
                }
                resolve(text)
              }
              reader.readAsText(file)
            })
        )
      )
      setRawText((prev) => (prev ? `${prev}\n\n---\n\n${texts.join('\n\n---\n\n')}` : texts.join('\n\n---\n\n')))
    }

    // PDF und Word -> Text extrahieren, Original-Datei für späteren Upload merken
    if (pdfFiles.length > 0 || docxFiles.length > 0) {
      setParsing(true)
      const newGuides: ParsedGuide[] = []
      for (const file of pdfFiles) {
        try {
          const text = await extractTextFromPdf(file)
          const hasRealText = text.trim().length >= 20
          newGuides.push({
            titel: filenameToTitle(file.name),
            bereich: defaultBereich.trim(),
            station: defaultStation.trim(),
            standort: '',
            content: hasRealText
              ? text.trim()
              : '(Kein Text im PDF gefunden — evtl. gescanntes Dokument. Texterkennung unten versuchen.)',
            originalFile: file,
            originalLabel: '📄 Original-PDF',
            needsOcr: !hasRealText
          })
        } catch (e) {
          showToast(`Konnte „${file.name}" nicht lesen.`)
        }
      }
      for (const file of docxFiles) {
        try {
          const text = await extractTextFromDocx(file)
          newGuides.push({
            titel: filenameToTitle(file.name),
            bereich: defaultBereich.trim(),
            station: defaultStation.trim(),
            standort: '',
            content: text.trim() || '(Kein Text im Dokument gefunden.)',
            originalFile: file,
            originalLabel: '📄 Original-Word-Dokument'
          })
        } catch (e) {
          showToast(`Konnte „${file.name}" nicht lesen.`)
        }
      }
      setFileGuides((prev) => [...prev, ...newGuides])
      setParsing(false)
    }
  }

  function removeFileGuide(idx: number) {
    setFileGuides((prev) => prev.filter((_, i) => i !== idx))
  }

  async function runOcr(idx: number) {
    const guide = fileGuides[idx]
    if (!guide.originalFile) return

    setFileGuides((prev) => prev.map((g, i) => (i === idx ? { ...g, ocrRunning: true } : g)))
    try {
      const text = await extractTextFromPdfWithOcr(guide.originalFile, (info) => {
        showToast(info)
      })
      setFileGuides((prev) =>
        prev.map((g, i) =>
          i === idx
            ? { ...g, content: text.trim() || '(Texterkennung hat keinen Text gefunden.)', needsOcr: false, ocrRunning: false }
            : g
        )
      )
      showToast('✅ Texterkennung abgeschlossen')
    } catch (e) {
      showToast('Texterkennung fehlgeschlagen')
      setFileGuides((prev) => prev.map((g, i) => (i === idx ? { ...g, ocrRunning: false } : g)))
    }
  }

  function handlePreview() {
    const fromText = parseImportText(rawText, defaultBereich.trim(), defaultStation.trim())
    setParsed([...fromText, ...fileGuides])
    setResultSummary(null)
  }

  async function resolveStationId(bereichName: string, stationName: string): Promise<string | null> {
    if (!bereichName.trim() || !stationName.trim()) return null

    let { data: area } = await supabase.from('areas').select('id').ilike('name', bereichName.trim()).maybeSingle()

    if (!area) {
      const { data: newArea } = await supabase
        .from('areas')
        .insert({ name: bereichName.trim(), icon: suggestAreaIcon(bereichName), sort_order: 999 })
        .select()
        .single()
      area = newArea
    }
    if (!area) return null

    let { data: station } = await supabase
      .from('stations')
      .select('id')
      .eq('area_id', area.id)
      .ilike('name', stationName.trim())
      .maybeSingle()

    if (!station) {
      const { data: newStation } = await supabase
        .from('stations')
        .insert({ area_id: area.id, name: stationName.trim(), sort_order: 999 })
        .select()
        .single()
      station = newStation
    }
    return station?.id ?? null
  }

  async function handleImport() {
    if (!parsed || parsed.length === 0) return
    setImporting(true)
    let success = 0
    let skipped = 0

    for (let i = 0; i < parsed.length; i++) {
      const guide = parsed[i]
      setImportProgress(`Anleitung ${i + 1} von ${parsed.length} …`)

      const stationId = await resolveStationId(guide.bereich, guide.station)
      if (!stationId) {
        skipped++
        continue
      }

      let content = guide.content
      if (guide.standort) {
        content = `[!INFO] Standort: ${guide.standort}\n\n${content}`
      }

      const { data, error } = await supabase
        .from('guides')
        .insert({
          station_id: stationId,
          title: guide.titel,
          slug: slugify(guide.titel),
          content,
          status: publishDirectly ? 'published' : 'draft',
          author_id: user?.id
        })
        .select()
        .single()

      if (error || !data) {
        skipped++
        continue
      }

      success++
      await logActivity(user?.id, 'create', 'guide', data.id, `hat „${guide.titel}" importiert`)

      // Original-Dokument hochladen und als Referenz-Link verknüpfen
      if (guide.originalFile) {
        const ext = guide.originalFile.name.split('.').pop() || 'pdf'
        const path = `imports/${data.id}.${ext}`
        const { error: uploadError } = await supabase.storage.from('guide-images').upload(path, guide.originalFile)
        if (!uploadError) {
          const publicUrl = supabase.storage.from('guide-images').getPublicUrl(path).data.publicUrl
          await supabase
            .from('guides')
            .update({ reference_url: publicUrl, reference_label: guide.originalLabel || 'Original-Dokument' })
            .eq('id', data.id)
        }
      }
    }

    setImporting(false)
    setImportProgress('')
    setResultSummary(
      `${success} Anleitung${success === 1 ? '' : 'en'} importiert${skipped > 0 ? `, ${skipped} übersprungen (Bereich/Station fehlt)` : ''}.`
    )
    showToast(`✅ ${success} Anleitung${success === 1 ? '' : 'en'} importiert`)
    setParsed(null)
    setRawText('')
    setFileGuides([])
  }

  return (
    <div>
      <Link to="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Verwaltung
      </Link>
      <h1 className="text-xl font-bold mb-2">📤 Anleitungen importieren</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Bestehenden Text einfügen, oder Dateien hochladen — auch mehrere auf einmal. Unterstützt: .txt, .md, .pdf,
        .docx. Bei PDF/Word wird der Text automatisch herausgelesen, das Original bleibt zusätzlich als Download
        verknüpft.
      </p>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 text-xs text-neutral-400 leading-relaxed">
        <strong className="text-neutral-300">Format für Text/Markdown (optional, aber empfohlen):</strong>
        <pre className="mt-2 whitespace-pre-wrap text-neutral-500">{`Titel: Bildschirm bleibt schwarz
Bereich: Dauerausstellung
Station: Fanwelt
Standort: EG, neben Haupteingang

Hier der eigentliche Inhalt …

---

Titel: Nächste Anleitung
...`}</pre>
        <p className="mt-2">
          Bereiche/Stationen, die es noch nicht gibt, werden automatisch neu angelegt. Bei PDF/Word wird der
          Dateiname zum Titel, Bereich/Station kommen aus den Standard-Feldern unten.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs text-neutral-400 mb-2">
          Ziel-Station für den Import wählen (wird automatisch als Bereich + Station verwendet, falls im Text/der
          Datei nichts anderes angegeben ist):
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Etage (Filter)</label>
            <select
              value={filterEtage}
              onChange={(e) => setFilterEtage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            >
              <option value="">Alle Etagen</option>
              {ETAGEN.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Station</label>
            <select
              onChange={(e) => handleStationPick(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            >
              <option value="">Station wählen …</option>
              {filteredStations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.areaName} › {s.name} {s.location ? `(${s.location})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(defaultBereich || defaultStation) && (
          <p className="text-xs text-neutral-500 mt-2">
            Gewählt: <strong className="text-neutral-300">{defaultBereich} › {defaultStation}</strong>
          </p>
        )}
        <p className="text-[11px] text-neutral-500 mt-2">
          Neue Station nicht dabei? Einfach im Text/der Datei "Bereich:" und "Station:" angeben — dann wird sie
          automatisch neu angelegt.
        </p>
      </div>

      <input
        type="file"
        accept=".txt,.md,.pdf,.docx"
        multiple
        id="importFileInput"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
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
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => document.getElementById('importFileInput')?.click()}
        className={`mb-3 px-4 py-6 border-2 border-dashed rounded-lg text-sm font-bold text-center cursor-pointer transition-colors ${
          dragActive ? 'border-accent bg-accent/10' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'
        }`}
      >
        {parsing ? 'Liest Datei …' : '📄 Datei(en) hierher ziehen oder antippen (.txt / .md / .pdf / .docx)'}
      </div>

      {fileGuides.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-neutral-400 mb-2">
            {fileGuides.length} Datei{fileGuides.length === 1 ? '' : 'en'} bereit zum Import
          </h3>
          <div className="flex flex-col gap-2">
            {fileGuides.map((g, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 flex justify-between items-center text-sm gap-2">
                <span className="truncate">{g.originalLabel} · {g.titel}</span>
                <div className="flex gap-2 shrink-0">
                  {g.needsOcr && (
                    <button
                      onClick={() => runOcr(i)}
                      disabled={g.ocrRunning}
                      className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded-lg font-bold"
                    >
                      {g.ocrRunning ? '…' : '🔍 Texterkennung'}
                    </button>
                  )}
                  <button onClick={() => removeFileGuide(i)} className="text-accent text-xs font-bold">
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Hier bestehenden Text einfügen …"
        className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm min-h-[200px]"
      />

      <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={publishDirectly}
          onChange={(e) => setPublishDirectly(e.target.checked)}
          className="w-4 h-4"
        />
        Direkt veröffentlichen (sonst als Entwurf importiert, zur Prüfung vor dem Freischalten)
      </label>

      {!parsed ? (
        <button
          onClick={handlePreview}
          disabled={!rawText.trim() && fileGuides.length === 0}
          className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold text-sm disabled:opacity-50"
        >
          Vorschau anzeigen
        </button>
      ) : (
        <div>
          <h2 className="text-sm font-bold text-neutral-400 mb-3">
            {parsed.length} Anleitung{parsed.length === 1 ? '' : 'en'} erkannt
          </h2>
          <div className="flex flex-col gap-2 mb-4">
            {parsed.map((g, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                <div className="font-bold text-sm">
                  {g.titel} {g.originalFile && <span className="text-xs text-neutral-500">({g.originalLabel})</span>}
                </div>
                <div className="text-xs text-neutral-500">
                  {g.bereich || '(kein Bereich)'} › {g.station || '(keine Station)'}
                  {g.standort ? ` · 📍 ${g.standort}` : ''}
                </div>
                <div className="text-xs text-neutral-600 mt-1 line-clamp-2 whitespace-pre-wrap">{g.content}</div>
              </div>
            ))}
          </div>
          {importProgress && <p className="text-xs text-neutral-500 mb-3">{importProgress}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setParsed(null)}
              className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold text-sm"
            >
              Zurück
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm"
            >
              {importing ? 'Importiert …' : `${parsed.length} Anleitung${parsed.length === 1 ? '' : 'en'} importieren`}
            </button>
          </div>
        </div>
      )}

      {resultSummary && (
        <div className="mt-4 bg-green-500/10 border border-green-500/40 rounded-lg p-3 text-sm text-green-300">
          ✅ {resultSummary}{' '}
          <button onClick={() => navigate('/')} className="underline">
            Zur Startseite
          </button>
        </div>
      )}
    </div>
  )
}
