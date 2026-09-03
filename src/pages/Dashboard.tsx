import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SkeletonCards } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { getRecentlyViewed, type RecentGuide } from '../lib/recentlyViewed'
import { colorForName } from '../lib/colorHash'
import type { Area } from '../types/database'

interface PopularGuide {
  id: string
  title: string
  view_count: number
}

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function Dashboard() {
  const { profile } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [stationCounts, setStationCounts] = useState<Record<string, number>>({})
  const [popular, setPopular] = useState<PopularGuide[]>([])
  const [recent, setRecent] = useState<RecentGuide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: areaData } = await supabase.from('areas').select('*').order('sort_order')
      setAreas(areaData ?? [])

      const { data: stations } = await supabase.from('stations').select('id, area_id')
      const counts: Record<string, number> = {}
      stations?.forEach((s) => {
        counts[s.area_id] = (counts[s.area_id] ?? 0) + 1
      })
      setStationCounts(counts)

      const { data: popularData } = await supabase
        .from('guides')
        .select('id, title, view_count')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(4)
      setPopular((popularData ?? []).filter((g) => g.view_count > 0))

      setRecent(getRecentlyViewed())
      setLoading(false)
    }
    load()
  }, [])

  const firstName = (profile?.full_name || profile?.email || '').split(' ')[0].split('@')[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        {greeting()}{firstName ? `, ${firstName}` : ''} 👋
      </h1>
      <p className="text-neutral-400 mb-5">Wonach suchst du?</p>

      <Link
        to="/quick-help"
        className="card-hover block bg-gradient-to-r from-accent to-accent-dark rounded-xl p-4 mb-8 text-white font-bold flex items-center gap-3 shadow-lg shadow-accent/20"
      >
        <span className="text-2xl">🚨</span>
        <div>
          <div>Ich habe ein Problem</div>
          <div className="text-xs font-normal text-white/80">Schnell die passende Anleitung finden</div>
        </div>
      </Link>

      {loading && <SkeletonCards count={4} />}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {areas.map((area) => {
            const [c1, c2] = colorForName(area.name)
            return (
              <Link
                key={area.id}
                to={`/areas/${area.id}`}
                className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3"
              >
                <div
                  className="icon-badge"
                  style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}22)`, borderColor: `${c1}55` }}
                >
                  {area.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{area.name}</div>
                  <div className="text-xs text-neutral-500">
                    {stationCounts[area.id] ?? 0} Station{(stationCounts[area.id] ?? 0) === 1 ? '' : 'en'}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && areas.length === 0 && (
        <EmptyState icon="📚" title="Noch keine Bereiche vorhanden" hint="Lege welche über die Verwaltung an." />
      )}

      {!loading && popular.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-neutral-400 mb-3">⭐ Häufig verwendet</h2>
          <div className="flex flex-col gap-2">
            {popular.map((g) => (
              <Link
                key={g.id}
                to={`/guides/${g.id}`}
                className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm flex justify-between items-center"
              >
                <span className="font-bold">{g.title}</span>
                <span className="text-xs text-neutral-500">{g.view_count}× angesehen</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && recent.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-neutral-400 mb-3">🕒 Zuletzt angesehen</h2>
          <div className="flex flex-col gap-2">
            {recent.map((g) => (
              <Link
                key={g.id}
                to={`/guides/${g.id}`}
                className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold"
              >
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
