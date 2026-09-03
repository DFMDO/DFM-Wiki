import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface FavoriteGuide {
  id: string
  title: string
  summary: string | null
}

export function Favorites() {
  const { user } = useAuth()
  const [guides, setGuides] = useState<FavoriteGuide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('favorites')
        .select('guide_id, guides(id, title, summary)')
        .eq('user_id', user.id)
      const list = (data ?? [])
        .map((row: any) => row.guides)
        .filter(Boolean)
      setGuides(list)
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">⭐ Favoriten</h1>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      <div className="flex flex-col gap-2">
        {guides.map((g) => (
          <Link
            key={g.id}
            to={`/guides/${g.id}`}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-accent transition"
          >
            <div className="font-bold">{g.title}</div>
            {g.summary && <div className="text-xs text-neutral-500">{g.summary}</div>}
          </Link>
        ))}
      </div>

      {!loading && guides.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-16">
          Noch keine Favoriten gespeichert. Tippe bei einer Anleitung auf "☆ Favorit", um sie hier zu sammeln.
        </p>
      )}
    </div>
  )
}
