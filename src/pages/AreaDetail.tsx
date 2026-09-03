import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonCards } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { colorForName } from '../lib/colorHash'
import type { Area, Station } from '../types/database'

export function AreaDetail() {
  const { areaId } = useParams()
  const [area, setArea] = useState<Area | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!areaId) return
      const { data: areaData } = await supabase.from('areas').select('*').eq('id', areaId).single()
      setArea(areaData)
      const { data: stationData } = await supabase
        .from('stations')
        .select('*')
        .eq('area_id', areaId)
        .order('sort_order')
      setStations(stationData ?? [])
      setLoading(false)
    }
    load()
  }, [areaId])

  if (loading) return <SkeletonCards count={4} />
  if (!area) return <EmptyState icon="😕" title="Bereich nicht gefunden" />

  const [c1, c2] = colorForName(area.name)

  return (
    <div>
      <nav className="text-xs text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-300">Startseite</Link> &rsaquo; {area.name}
      </nav>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="icon-badge" style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}22)`, borderColor: `${c1}55` }}>
          {area.icon}
        </span>{' '}
        {area.name}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stations.map((station) => (
          <Link
            key={station.id}
            to={`/stations/${station.id}`}
            className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="icon-badge">{station.icon}</div>
            <div className="min-w-0">
              <div className="font-bold truncate">{station.name}</div>
              {station.location && <div className="text-xs text-neutral-500 truncate">📍 {station.location}</div>}
            </div>
          </Link>
        ))}
      </div>

      {stations.length === 0 && (
        <EmptyState icon="📚" title="Noch keine Stationen in diesem Bereich" />
      )}
    </div>
  )
}
