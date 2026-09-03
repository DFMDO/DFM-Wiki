import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activity'
import { KNOWN_STATION_NAMES } from '../lib/stationNames'
import { ETAGEN } from '../lib/museumLocations'
import type { Area, Station } from '../types/database'

interface Stats {
  guides: number
  areas: number
  stations: number
  users: number
  openReports: number
}

export function Admin() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaIcon, setNewAreaIcon] = useState('📁')

  const [stations, setStations] = useState<Station[]>([])
  const [newStationName, setNewStationName] = useState('')
  const [customStationName, setCustomStationName] = useState('')
  const [newStationArea, setNewStationArea] = useState('')
  const [newStationLocation, setNewStationLocation] = useState('')

  async function loadAll() {
    const { data: a } = await supabase.from('areas').select('*').order('sort_order')
    setAreas(a ?? [])
    const { data: s } = await supabase.from('stations').select('*').order('sort_order')
    setStations(s ?? [])

    const [{ count: guideCount }, { count: userCount }, { count: reportCount }] = await Promise.all([
      supabase.from('guides').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('problem_reports').select('*', { count: 'exact', head: true }).eq('status', 'open')
    ])
    setStats({
      guides: guideCount ?? 0,
      areas: (a ?? []).length,
      stations: (s ?? []).length,
      users: userCount ?? 0,
      openReports: reportCount ?? 0
    })
  }

  async function exportBackup() {
    const [areasRes, stationsRes, guidesRes, tagsRes, guideTagsRes] = await Promise.all([
      supabase.from('areas').select('*'),
      supabase.from('stations').select('*'),
      supabase.from('guides').select('*'),
      supabase.from('tags').select('*'),
      supabase.from('guide_tags').select('*')
    ])

    const backup = {
      exported_at: new Date().toISOString(),
      areas: areasRes.data ?? [],
      stations: stationsRes.data ?? [],
      guides: guidesRes.data ?? [],
      tags: tagsRes.data ?? [],
      guide_tags: guideTagsRes.data ?? []
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `museum-wiki-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function suggestIcon(name: string) {
    const n = name.toLowerCase()
    if (n.includes('sonder')) return '🎪'
    if (n.includes('dauer')) return '🏛️'
    if (n.includes('gebäude') || n.includes('technik')) return '🏢'
    if (n.includes('außen')) return '🌳'
    if (n.includes('veranstalt')) return '🎭'
    if (n.includes('it')) return '💻'
    if (n.includes('werkstatt')) return '🔧'
    if (n.includes('sicherheit')) return '🛡️'
    return '📁'
  }

  async function addArea() {
    if (!newAreaName.trim()) return
    await supabase.from('areas').insert({ name: newAreaName.trim(), icon: newAreaIcon, sort_order: areas.length })
    await logActivity(user?.id, 'create', 'area', null, `hat den Bereich „${newAreaName.trim()}" erstellt`)
    setNewAreaName('')
    setNewAreaIcon('📁')
    loadAll()
  }

  async function addStation() {
    const finalName = newStationName === '__custom__' ? customStationName.trim() : newStationName
    if (!finalName || !newStationArea) return
    await supabase.from('stations').insert({
      area_id: newStationArea,
      name: finalName,
      location: newStationLocation.trim() || null,
      sort_order: stations.filter((s) => s.area_id === newStationArea).length
    })
    await logActivity(user?.id, 'create', 'station', null, `hat die Station „${finalName}" erstellt`)
    setNewStationName('')
    setCustomStationName('')
    setNewStationLocation('')
    loadAll()
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Verwaltung</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          <StatCard label="Anleitungen" value={stats.guides} icon="📚" />
          <StatCard label="Bereiche" value={stats.areas} icon="🏢" />
          <StatCard label="Stationen" value={stats.stations} icon="⚙️" />
          <StatCard label="Benutzer" value={stats.users} icon="👥" />
          <StatCard label="Offene Meldungen" value={stats.openReports} icon="🐞" />
        </div>
      )}

      <div className="flex gap-2 mb-8 flex-wrap">
        {profile?.role === 'admin' && (
          <Link
            to="/admin/users"
            className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
          >
            👥 Benutzerverwaltung öffnen
          </Link>
        )}
        <Link
          to="/admin/activity"
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          📜 Aktivitätsprotokoll öffnen
        </Link>
        <Link
          to="/admin/problems"
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          🐞 Problemmeldungen öffnen
        </Link>
        <Link
          to="/admin/import"
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          📤 Anleitungen importieren
        </Link>
        <Link
          to="/admin/drafts"
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          📝 Entwürfe anzeigen
        </Link>
        <Link
          to="/admin/feedback"
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          👎 Negatives Feedback
        </Link>
        <button
          onClick={exportBackup}
          className="inline-block text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg font-bold"
        >
          💾 Backup exportieren
        </button>
      </div>

      <section className="mb-10">
        <h2 className="font-bold mb-3">Bereiche</h2>
        <div className="flex flex-col gap-2 mb-4">
          {areas.map((a) => (
            <div key={a.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <span>{a.icon}</span> {a.name}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newAreaIcon}
            onChange={(e) => setNewAreaIcon(e.target.value)}
            className="w-14 px-2 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-center"
          />
          <input
            value={newAreaName}
            onChange={(e) => {
              setNewAreaName(e.target.value)
              setNewAreaIcon(suggestIcon(e.target.value))
            }}
            placeholder="Name des Bereichs, z.B. Dauerausstellung"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          />
          <button onClick={addArea} className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm">
            + Anlegen
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Stationen</h2>
        <div className="flex flex-col gap-2 mb-4">
          {stations.map((s) => {
            const area = areas.find((a) => a.id === s.area_id)
            return (
              <div key={s.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm">
                <span className="font-bold">{s.name}</span>{' '}
                <span className="text-neutral-500">— {area?.name}</span>
                {s.location && <span className="text-neutral-500"> · 📍 {s.location}</span>}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={newStationArea}
            onChange={(e) => setNewStationArea(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Bereich wählen …</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>

          {newStationName !== '__custom__' ? (
            <select
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            >
              <option value="">Station wählen …</option>
              {KNOWN_STATION_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__custom__">+ Andere / neue Station …</option>
            </select>
          ) : (
            <input
              value={customStationName}
              onChange={(e) => setCustomStationName(e.target.value)}
              placeholder="Name der neuen Station"
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            />
          )}

          <select
            value={newStationLocation}
            onChange={(e) => setNewStationLocation(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Etage wählen …</option>
            {ETAGEN.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <button onClick={addStation} className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg font-bold text-sm">
            + Anlegen
          </button>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  )
}
