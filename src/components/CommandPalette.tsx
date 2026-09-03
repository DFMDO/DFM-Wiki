import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Result {
  id: string
  title: string
  summary: string | null
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const { data } = await supabase
      .from('guides')
      .select('id, title, summary')
      .eq('status', 'published')
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
      .limit(8)
    setResults(data ?? [])
  }

  function goTo(id: string) {
    setOpen(false)
    navigate(`/guides/${id}`)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 flex items-start justify-center pt-24 px-4 fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Anleitung suchen … (Esc zum Schließen)"
          className="w-full px-4 py-3 bg-transparent border-b border-neutral-800 text-sm focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => goTo(r.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-800 text-sm border-b border-neutral-800/60 last:border-0"
            >
              <div className="font-bold">{r.title}</div>
              {r.summary && <div className="text-xs text-neutral-500">{r.summary}</div>}
            </button>
          ))}
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-neutral-500 text-center">Keine Treffer</div>
          )}
          {query.trim().length < 2 && (
            <div className="px-4 py-6 text-xs text-neutral-600 text-center">
              Mindestens 2 Zeichen eingeben, um zu suchen.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
