import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QrCodeView } from '../components/QrCodeView'
import type { Station } from '../types/database'

export function StationQr() {
  const { stationId } = useParams()
  const [station, setStation] = useState<Station | null>(null)

  useEffect(() => {
    async function load() {
      if (!stationId) return
      const { data } = await supabase.from('stations').select('*').eq('id', stationId).single()
      setStation(data)
    }
    load()
  }, [stationId])

  if (!station) return <p className="text-neutral-500 text-sm">Lädt …</p>

  const url = `${window.location.origin}${import.meta.env.BASE_URL}stations/${station.id}`

  return (
    <div>
      <Link to={`/stations/${station.id}`} className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Station
      </Link>
      <h1 className="text-xl font-bold mb-6">QR-Code · {station.name}</h1>
      <QrCodeView url={url} label={station.name} sublabel="Scannen führt direkt zu dieser Station" />
    </div>
  )
}
