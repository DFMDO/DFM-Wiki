import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SkeletonList } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import type { Station, Guide, Area } from '../types/database'

export function StationDetail() {
  const { stationId } = useParams()
  const { profile } = useAuth()
  const [station, setStation] = useState<Station | null>(null)
  const [area, setArea] = useState<Area | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)

  const canEdit = profile?.role === 'admin' || profile?.role === 'technician'

  useEffect(() => {
    async function load() {
      if (!stationId) return
      const { data: stationData } = await supabase.from('stations').select('*').eq('id', stationId).single()
      setStation(stationData)
      if (stationData) {
        const { data: areaData } = await supabase.from('areas').select('*').eq('id', stationData.area_id).single()
        setArea(areaData)
      }
      const { data: guideData } = await supabase
        .from('guides')
        .select('*')
        .eq('station_id', stationId)
        .order('title')
      setGuides(guideData ?? [])
      setLoading(false)
    }
    load()
  }, [stationId])

  if (loading) return <SkeletonList count={4} />
  if (!station) return <EmptyState icon="😕" title="Station nicht gefunden" />

  return (
    <div>
      <nav className="text-xs text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-300">Startseite</Link> &rsaquo;{' '}
        {area && <Link to={`/areas/${area.id}`} className="hover:text-neutral-300">{area.name}</Link>} &rsaquo;{' '}
        {station.name}
      </nav>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="icon-badge">{station.icon}</span> {station.name}
        </h1>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              to={`/stations/${station.id}/qr`}
              className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg font-bold transition"
            >
              QR-Code
            </Link>
            <Link
              to={`/stations/${station.id}/new-guide`}
              className="text-sm bg-accent hover:bg-accent-dark px-3 py-2 rounded-lg font-bold transition shadow-lg shadow-accent/20"
            >
              + Neue Anleitung
            </Link>
          </div>
        )}
      </div>
      {station.location && <p className="text-sm text-neutral-500 mb-4">📍 {station.location}</p>}

      <div className="flex flex-col gap-2 mt-4">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            to={`/guides/${guide.id}`}
            className="card-hover bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center"
          >
            <div className="min-w-0">
              <div className="font-bold truncate">{guide.title}</div>
              {guide.summary && <div className="text-xs text-neutral-500 truncate">{guide.summary}</div>}
            </div>
            {guide.status !== 'published' && (
              <span className="text-xs bg-neutral-800 px-2 py-1 rounded shrink-0 ml-2">{guide.status}</span>
            )}
          </Link>
        ))}
      </div>

      {guides.length === 0 && (
        <EmptyState icon="📚" title="Noch keine Anleitungen für diese Station" />
      )}
    </div>
  )
}
