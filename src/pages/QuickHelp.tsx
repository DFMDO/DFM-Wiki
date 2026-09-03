import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/EmptyState'

const categories: { label: string; icon: string; keywords: string[] }[] = [
  { label: 'Bildschirm', icon: '🖥️', keywords: ['bildschirm', 'display', 'schwarz', 'monitor'] },
  { label: 'Ton', icon: '🔊', keywords: ['ton', 'audio', 'lautsprecher', 'sound'] },
  { label: 'Licht', icon: '💡', keywords: ['licht', 'beleuchtung', 'lampe'] },
  { label: 'Strom', icon: '⚡', keywords: ['strom', 'stromversorgung', 'sicherung', 'steckdose'] },
  { label: 'Netzwerk', icon: '🌐', keywords: ['netzwerk', 'wlan', 'internet', 'verbindung'] },
  { label: 'Steuerung', icon: '🎮', keywords: ['steuerung', 'bedienung', 'controller', 'touch'] },
  { label: 'Mechanik', icon: '🔧', keywords: ['mechanik', 'motor', 'antrieb', 'klemmt'] },
  { label: 'Sonstiges', icon: '❓', keywords: [] }
]

interface ResultGuide {
  id: string
  title: string
  summary: string | null
}

export function QuickHelp() {
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<ResultGuide[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function pickCategory(cat: (typeof categories)[number]) {
    setSelected(cat.label)
    setSearched(true)
    setLoading(true)

    if (cat.keywords.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    const orFilter = cat.keywords
      .map((k) => `title.ilike.%${k}%,summary.ilike.%${k}%,content.ilike.%${k}%`)
      .join(',')

    const { data } = await supabase
      .from('guides')
      .select('id, title, summary')
      .eq('status', 'published')
      .or(orFilter)
      .limit(20)

    setResults(data ?? [])
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🚨 Ich habe ein Problem</h1>
      <p className="text-neutral-400 mb-6">Was funktioniert nicht?</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => pickCategory(cat)}
            className={`card-hover bg-neutral-900 border rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-bold ${
              selected === cat.label ? 'border-accent text-accent' : 'border-neutral-800'
            }`}
          >
            <span className="text-2xl">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-neutral-500">Suche passende Anleitungen …</p>}

      {searched && !loading && (
        <div>
          <h2 className="text-sm font-bold text-neutral-400 mb-3">Passende Anleitungen</h2>
          <div className="flex flex-col gap-2">
            {results.map((g) => (
              <Link
                key={g.id}
                to={`/guides/${g.id}`}
                className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl p-4"
              >
                <div className="font-bold">{g.title}</div>
                {g.summary && <div className="text-xs text-neutral-500">{g.summary}</div>}
              </Link>
            ))}
          </div>
          {results.length === 0 && (
            <EmptyState
              icon="🔍"
              title="Keine passende Anleitung gefunden"
              hint="Nutze stattdessen die Suche oder melde das Problem direkt bei einer Anleitung."
            />
          )}
        </div>
      )}
    </div>
  )
}
