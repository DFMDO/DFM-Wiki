export const ETAGEN = ['2.OG', '1.OG', 'EG / UG'] as const

export const KERN_BY_ETAGE: Record<string, string[]> = {
  '2.OG': ['Kern 1-1', 'Kern 1-2', 'Kern 2-1', 'Kern 2-2'],
  '1.OG': ['Kern 1', 'Kern 2-1', 'Kern 2-2'],
  'EG / UG': []
}

export function parseLocation(value: string): { etage: string; kern: string } {
  if (!value) return { etage: '', kern: '' }
  const parts = value.split(' - ')
  if (parts.length === 2) return { etage: parts[0], kern: parts[1] }
  return { etage: value, kern: '' }
}

export function formatLocation(etage: string, kern: string): string {
  if (!etage) return ''
  return kern ? `${etage} - ${kern}` : etage
}
