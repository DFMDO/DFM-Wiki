import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ETAGEN } from '../lib/museumLocations'

interface StationOption {
  id: string
  name: string
  location: string | null
  areaName: string
}

export function NewGuideStart() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<StationOption[]>([])
  const [filterEtage, setFilterEtage] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('stations').select('id, name, location, areas(name)').order('name')
      setStations(
        (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.location,
          areaName: s.areas?.name ?? ''
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  const filteredStations = filterEtage ? stations.filter((s) => (s.location || '').startsWith(filterEtage)) : stations

  function handleContinue() {
    if (!selectedStation) return
    navigate(`/stations/${selectedStation}/new-guide`)
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">✍️ Neue Anleitung schreiben</h1>
      <p className="text-sm text-neutral-400 mb-6">Für welche Station soll die Anleitung sein?</p>

      {loading && <p className="text-sm text-neutral-500">Lädt …</p>}

      {!loading && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <label className="block text-xs text-neutral-400 mb-1">Etage (optional, zum Eingrenzen)</label>
          <select
            value={filterEtage}
            onChange={(e) => {
              setFilterEtage(e.target.value)
              setSelectedStation('')
            }}
            className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Alle Etagen</option>
            {ETAGEN.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <label className="block text-xs text-neutral-400 mb-1">Station</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Station wählen …</option>
            {filteredStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.areaName} › {s.name} {s.location ? `(${s.location})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={handleContinue}
            disabled={!selectedStation}
            className="w-full py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm disabled:opacity-50"
          >
            Weiter zum Editor →
          </button>

          {filteredStations.length === 0 && !loading && (
            <p className="text-xs text-neutral-500 mt-3">
              Keine Station gefunden — leg zuerst eine über die Verwaltung an.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
