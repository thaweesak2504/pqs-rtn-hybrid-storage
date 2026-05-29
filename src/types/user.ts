// Basic User types
// Phase 1 security: password_hash is intentionally NOT part of this type.
// The backend is the single source of truth for password hashing; the frontend
// never reads or writes hashes.
export interface User {
  id?: number
  username: string
  email: string
  full_name: string
  rank?: string
  role: 'admin' | 'editor' | 'visitor'
  is_active: boolean
  /** True when the user must change password before any other action (seeded default admin). */
  must_change_password?: boolean
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
