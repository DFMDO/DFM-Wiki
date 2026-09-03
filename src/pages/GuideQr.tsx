import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QrCodeView } from '../components/QrCodeView'
import type { Guide } from '../types/database'

export function GuideQr() {
  const { guideId } = useParams()
  const [guide, setGuide] = useState<Guide | null>(null)

  useEffect(() => {
    async function load() {
      if (!guideId) return
      const { data } = await supabase.from('guides').select('*').eq('id', guideId).single()
      setGuide(data)
    }
    load()
  }, [guideId])

  if (!guide) return <p className="text-neutral-500 text-sm">Lädt …</p>

  const url = `${window.location.origin}${import.meta.env.BASE_URL}guides/${guide.id}`

  return (
    <div>
      <Link to={`/guides/${guide.id}`} className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 inline-block">
        ← Zurück zur Anleitung
      </Link>
      <h1 className="text-xl font-bold mb-6">QR-Code · {guide.title}</h1>
      <QrCodeView url={url} label={guide.title} sublabel="Scannen führt direkt zu dieser Anleitung" />
    </div>
  )
}
