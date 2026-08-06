import { render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'

const { validateAuthSession, revokeAuthSession, authenticateUser } = vi.hoisted(() => ({
  validateAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
  authenticateUser: vi.fn(),
}))

vi.mock('../../services/tauriService', () => ({
  tauriUserService: {
    validateAuthSession,
    revokeAuthSession,
    authenticateUser,
  },
}))

vi.mock('../../services/hybridAvatarService', () => ({
  hybridAvatarService: {
    getAvatarInfo: vi.fn().mockResolvedValue({ avatar_path: null, file_exists: false }),
    getAvatarBase64: vi.fn(),
  },
}))

import { AuthProvider } from '../../contexts/AuthContext'

const AuthProbe = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div>Loading</div>
  return <div>{isAuthenticated ? `${user?.username}:${user?.role}` : 'Signed out'}</div>
}

describe('AuthContext session restoration', () => {
  beforeEach(() => {
    localStorage.clear()
    validateAuthSession.mockReset()
    revokeAuthSession.mockReset()
    authenticateUser.mockReset()
  })

  it('refreshes identity and role from the backend instead of trusting localStorage', async () => {
    localStorage.setItem('pqs_user', JSON.stringify({ id: '7', username: 'stale', role: 'admin' }))
    const token = 'valid-backend-session-token-1234567890'
    localStorage.setItem('pqs_token', token)
    validateAuthSession.mockResolvedValue({
      id: 7,
      username: 'verified',
      email: 'verified@example.test',
      full_name: 'Verified User',
      rank: null,
      role: 'visitor',
      is_active: true,
      avatar_path: null,
      avatar_updated_at: null,
      avatar_mime: null,
      avatar_size: null,
      created_at: null,
      updated_at: null,
      must_change_password: false,
    })

    render(<AuthProvider><AuthProbe /></AuthProvider>)

    expect(await screen.findByText('verified:visitor')).toBeInTheDocument()
    expect(validateAuthSession).toHaveBeenCalledWith(token)
    expect(localStorage.getItem('pqs_token')).toBe(token)
    expect(JSON.parse(localStorage.getItem('pqs_user') || '{}').role).toBe('visitor')
  })

  it('clears a snapshot when the backend user is inactive or missing', async () => {
    localStorage.setItem('pqs_user', JSON.stringify({ id: '8', username: 'disabled' }))
    localStorage.setItem('pqs_token', 'expired-backend-session-token-123456')
    validateAuthSession.mockResolvedValue(null)

    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument())
    expect(localStorage.getItem('pqs_user')).toBeNull()
  })
})
