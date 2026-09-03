export type Role = 'admin' | 'technician' | 'employee'
export type GuideStatus = 'draft' | 'published' | 'archived'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  avatar_url: string | null
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface Area {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Station {
  id: string
  area_id: string
  name: string
  description: string | null
  location: string | null
  icon: string | null
  image_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Guide {
  id: string
  station_id: string
  title: string
  slug: string
  summary: string | null
  content: string
  status: GuideStatus
  author_id: string | null
  view_count: number
  helpful_count: number
  not_helpful_count: number
  reference_url: string | null
  reference_label: string | null
  created_at: string
  updated_at: string
}
