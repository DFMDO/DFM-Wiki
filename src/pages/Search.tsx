import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/EmptyState'

interface Result {
  id: string
  title: string
  summary: string | null
  station_id: string
}

interface Tag {
  id: string
  name: string
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    supabase
      .from('tags')
      .select('*')
      .order('name')
      .then(({ data }) => setAllTags(data ?? []))
  }, [])

  function toggleTag(id: string) {
    setActiveTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function runSearch(q: string, tagIds: string[]) {
    if (q.trim().length < 2 && tagIds.length === 0) {
      setResults([])
      setSearched(false)
      return
    }
    setSearched(true)
    setLoading(true)

    let guideIdsFromTags: string[] | null = null
    if (tagIds.length > 0) {
      const { data: tagRows } = await supabase.from('guide_tags').select('guide_id').in('tag_id', tagIds)
      guideIdsFromTags = [...new Set((tagRows ?? []).map((r) => r.guide_id))]
      if (guideIdsFromTags.length === 0) {
        setResults([])
        setLoading(false)
        return
      }
    }

    let builder = supabase.from('guides').select('id, title, summary, station_id').eq('status', 'published')
    if (q.trim().length >= 2) {
      builder = builder.or(`title.ilike.%${q}%,summary.ilike.%${q}%,content.ilike.%${q}%`)
    }
    if (guideIdsFromTags) {
      builder = builder.in('id', guideIdsFromTags)
    }

    const { data } = await builder.limit(30)
    setResults(data ?? [])
    setLoading(false)
  }

  function handleSearchInput(q: string) {
    setQuery(q)
    runSearch(q, activeTagIds)
  }

  function handleTagToggle(id: string) {
    const next = activeTagIds.includes(id) ? activeTagIds.filter((t) => t !== id) : [...activeTagIds, id]
    setActiveTagIds(next)
    runSearch(query, next)
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Suche</h1>
      <input
        autoFocus
        value={query}
        onChange={(e) => handleSearchInput(e.target.value)}
        placeholder="Titel, Beschreibung, Inhalt …"
        className="w-full mb-3 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
      />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagToggle(tag.id)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition ${
                activeTagIds.includes(tag.id)
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-neutral-500">Suche läuft …</p>}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <Link
            key={r.id}
            to={`/guides/${r.id}`}
            className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl p-4"
          >
            <div className="font-bold">{r.title}</div>
            {r.summary && <div className="text-xs text-neutral-500">{r.summary}</div>}
          </Link>
        ))}
      </div>

      {!loading && searched && results.length === 0 && (
        <EmptyState icon="🔍" title="Keine Treffer gefunden" />
      )}
    </div>
  )
}
