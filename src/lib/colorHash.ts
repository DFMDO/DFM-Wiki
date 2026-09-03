const palette: [string, string][] = [
  ['#e2273e', '#b81f32'], // Rot
  ['#3b82f6', '#1d4ed8'], // Blau
  ['#22c55e', '#15803d'], // Grün
  ['#f59e0b', '#b45309'], // Amber
  ['#a855f7', '#7e22ce'], // Lila
  ['#06b6d4', '#0e7490'], // Türkis
  ['#ec4899', '#be185d'] // Pink
]

export function colorForName(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return palette[hash % palette.length]
}
