export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  JWT_SECRET?: string
}

export interface AuthUser {
  id: number
  username: string
  name: string
  email: string | null
  title: string | null
  bio: string | null
  skills: string | null
  avatar_color: string
  is_admin: number
  active: number
  roles: string[]
}

export type Variables = {
  user: AuthUser
}
