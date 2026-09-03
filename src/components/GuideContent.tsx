import { useState } from 'react'

const calloutTypes: Record<string, { icon: string; classes: string }> = {
  WARNUNG: { icon: '⚠️', classes: 'bg-orange-500/10 border-orange-500/40' },
  GEFAHR: { icon: '🛑', classes: 'bg-red-500/10 border-red-500/40' },
  INFO: { icon: 'ℹ️', classes: 'bg-blue-500/10 border-blue-500/40' },
  TIPP: { icon: '💡', classes: 'bg-yellow-500/10 border-yellow-500/40' },
  LOESUNG: { icon: '✅', classes: 'bg-green-500/10 border-green-500/40' }
}

// Erlaubt sowohl [!LÖSUNG] als auch [!LOESUNG] als Schreibweise
function normalizeType(raw: string): string {
  return raw.toUpperCase().replace('Ö', 'OE').replace('Ä', 'AE').replace('Ü', 'UE')
}

function StepChecklist({ lines }: { lines: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => lines.map(() => false))
  const doneCount = checked.filter(Boolean).length
  const allDone = doneCount === lines.length

  function toggle(i: number) {
    setChecked((prev) => prev.map((c, idx) => (idx === i ? !c : c)))
  }

  return (
    <div className="bg-neutral-950/40 border border-neutral-800 rounded-lg p-3">
      <div className="flex flex-col gap-2 mb-2">
        {lines.map((line, i) => {
          const text = line.replace(/^\d+\.\s*/, '')
          return (
            <label
              key={i}
              className={`flex items-start gap-2 text-sm cursor-pointer transition-colors ${
                checked[i] ? 'text-neutral-500 line-through' : 'text-neutral-200'
              }`}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 accent-current shrink-0"
                style={{ accentColor: '#e2273e' }}
              />
              <span className="leading-snug">{text}</span>
            </label>
          )
        })}
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${lines.length ? (doneCount / lines.length) * 100 : 0}%` }}
        />
      </div>
      {allDone && <p className="text-sm text-green-400 mt-2 fade-in">🎉 Alle Schritte erledigt!</p>}
    </div>
  )
}

interface MediaItem {
  id: string
  url: string
  fileType?: string | null
}

export function GuideContent({ content, media = [] }: { content: string; media?: MediaItem[] }) {
  if (!content.trim()) {
    return <span className="text-neutral-500">Noch kein Inhalt.</span>
  }

  const blocks = content.split(/\n\s*\n/)

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const calloutMatch = block.match(/^\[!([A-Za-zÄÖÜäöü]+)\]\s*/)
        if (calloutMatch) {
          const type = normalizeType(calloutMatch[1])
          const style = calloutTypes[type]
          const text = block.slice(calloutMatch[0].length).trim()
          if (style) {
            return (
              <div key={i} className={`border rounded-lg p-3 flex gap-2 items-start ${style.classes}`}>
                <span className="text-lg leading-none">{style.icon}</span>
                <span className="whitespace-pre-wrap text-sm leading-relaxed">{text}</span>
              </div>
            )
          }
        }

        // Bild an dieser Stelle im Text einbetten: [Bild 1], [Foto 2], [Abb. 3] ...
        const imageMatch = block.match(/^\[(?:Bild|Foto|Abb\.?)\s*(\d+)\]\s*(.*)$/i)
        if (imageMatch) {
          const idx = parseInt(imageMatch[1], 10) - 1
          const caption = imageMatch[2]?.trim()
          const item = media[idx]
          if (item) {
            const isVideo = item.fileType?.startsWith('video/')
            return (
              <figure key={i} className="my-1">
                {isVideo ? (
                  <video src={item.url} controls muted playsInline className="w-full rounded-lg bg-black" />
                ) : (
                  <img src={item.url} alt={caption || `Abbildung ${idx + 1}`} className="w-full rounded-lg" />
                )}
                <figcaption className="text-xs text-neutral-500 mt-1.5 text-center">
                  Abb. {idx + 1}
                  {caption ? ` — ${caption}` : ''}
                </figcaption>
              </figure>
            )
          }
        }

        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l))
        if (isNumberedList) {
          return <StepChecklist key={i} lines={lines} />
        }

        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {block}
          </p>
        )
      })}
    </div>
  )
}
