const KEY = 'museum_wiki_recently_viewed'
const MAX_ITEMS = 8

export interface RecentGuide {
  id: string
  title: string
  viewedAt: number
}

export function addRecentlyViewed(id: string, title: string) {
  try {
    const list = getRecentlyViewed().filter((g) => g.id !== id)
    list.unshift({ id, title, viewedAt: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    // localStorage evtl. nicht verfügbar -> stillschweigend ignorieren
  }
}

export function getRecentlyViewed(): RecentGuide[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
