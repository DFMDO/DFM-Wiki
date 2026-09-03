export function suggestAreaIcon(name: string): string {
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
