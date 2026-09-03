import { ETAGEN, KERN_BY_ETAGE, parseLocation, formatLocation } from '../lib/museumLocations'

export function LocationPicker({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { etage, kern } = parseLocation(value)
  const kernOptions = KERN_BY_ETAGE[etage] || []

  function handleEtageChange(newEtage: string) {
    const options = KERN_BY_ETAGE[newEtage] || []
    onChange(formatLocation(newEtage, options.length > 0 ? '' : ''))
  }

  function handleKernChange(newKern: string) {
    onChange(formatLocation(etage, newKern))
  }

  return (
    <div className="flex gap-2">
      <select
        value={etage}
        onChange={(e) => handleEtageChange(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
      >
        <option value="">Etage wählen …</option>
        {ETAGEN.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      {kernOptions.length > 0 && (
        <select
          value={kern}
          onChange={(e) => handleKernChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
        >
          <option value="">Bereich wählen …</option>
          {kernOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
