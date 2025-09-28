// Basic User types for Phase 1
export interface User {
  id?: number
  username: string
  email: string
  password_hash?: string
  full_name: string
  rank?: string
  role: 'admin' | 'editor' | 'visitor'
  is_active: boolean
  created_at: string
  updated_at: string
  // Optional avatar image data or path (to be implemented). For now nullable.
  avatar?: string | null
  avatar_path?: string | null
  avatar_updated_at?: string | null
  avatar_mime?: string | null
  avatar_size?: number | null
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  full_name: string
  rank?: string
  role?: 'admin' | 'editor' | 'visitor'
}

export interface LoginCredentials {
  username_or_email: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  error?: string
}
