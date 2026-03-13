export type ApiResponse<T> = {
  success: true
  data: T
}

export type ApiError = {
  error: string
  message?: string
  upgrade_url?: string
}

export type PaginatedResponse<T> = {
  success: true
  data: {
    items: T[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }
}

export type Project = {
  id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  status: string
  craft_type: string
  ravelry_id: string | null
  started_at: string | null
  finished_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  sections?: ProjectSection[]
}

export type ProjectSection = {
  id: string
  project_id: string
  name: string
  description: string | null
  target_rows: number | null
  current_row: number
  sort_order: number
}

export type Pattern = {
  id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  craft_type: string
  difficulty: string | null
  garment_type: string | null
  source_url: string | null
  pdf_url: string | null
  is_public: boolean
  ravelry_id: string | null
  ai_parsed: boolean
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  image_url: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  isLiked?: boolean
  _count?: {
    likes: number
    comments: number
  }
}

export type User = {
  id: string
  clerk_id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_pro: boolean
  created_at: string
  updated_at: string
}
