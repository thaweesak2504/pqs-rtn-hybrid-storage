import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
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

import { AuthProvider, LAST_SIGNED_IN_IDENTIFIER_KEY } from '../../contexts/AuthContext'

const AuthProbe = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div>Loading</div>
  return <div>{isAuthenticated ? `${user?.username}:${user?.role}` : 'Signed out'}</div>
}

const SignInProbe = ({ identifier = 'editor' }: { identifier?: string }) => {
  const { isLoading, signIn, signOut } = useAuth()
  const [result, setResult] = React.useState('idle')

  return (
    <div>
      <span>{isLoading ? 'Global loading' : 'Global ready'}</span>
      <button
        onClick={async () => {
          const response = await signIn({ username_or_email: identifier, password: 'wrong' })
          setResult(response.success ? 'success' : response.reason)
        }}
      >
        Sign in
      </button>
      <button onClick={signOut}>Sign out</button>
      <span>{result}</span>
    </div>
  )
}

describe('AuthContext session restoration', () => {
  beforeEach(() => {
    localStorage.clear()
    validateAuthSession.mockReset()
    revokeAuthSession.mockReset()
    revokeAuthSession.mockResolvedValue(undefined)
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
    expect(localStorage.getItem(LAST_SIGNED_IN_IDENTIFIER_KEY)).toBeNull()
  })

  it('clears a snapshot when the backend user is inactive or missing', async () => {
    localStorage.setItem('pqs_user', JSON.stringify({ id: '8', username: 'disabled' }))
    localStorage.setItem('pqs_token', 'expired-backend-session-token-123456')
    validateAuthSession.mockResolvedValue(null)

    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument())
    expect(localStorage.getItem('pqs_user')).toBeNull()
  })

  it('keeps auth loading during the Strict Mode effect replay until restoration finishes', async () => {
    localStorage.setItem('pqs_token', 'strict-mode-session-token-1234567890')
    let resolveValidation: ((value: Record<string, unknown>) => void) | undefined
    validateAuthSession.mockReturnValue(new Promise(resolve => {
      resolveValidation = resolve
    }))

    render(
      <React.StrictMode>
        <AuthProvider><AuthProbe /></AuthProvider>
      </React.StrictMode>,
    )

    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('Signed out')).not.toBeInTheDocument()
    expect(validateAuthSession).toHaveBeenCalledOnce()

    await act(async () => {
      resolveValidation?.({
        id: 9,
        username: 'restored',
        email: 'restored@example.test',
        full_name: 'Restored User',
        rank: null,
        role: 'editor',
        is_active: true,
        avatar_path: null,
        avatar_updated_at: null,
        avatar_mime: null,
        avatar_size: null,
        created_at: null,
        updated_at: null,
        must_change_password: false,
      })
      await Promise.resolve()
    })

    expect(await screen.findByText('restored:editor')).toBeInTheDocument()
  })

  it('does not reuse startup loading while a sign-in request is pending', async () => {
    let resolveAuthentication: ((value: null) => void) | undefined
    authenticateUser.mockReturnValue(new Promise(resolve => {
      resolveAuthentication = resolve
    }))

    render(<AuthProvider><SignInProbe identifier="Admin" /></AuthProvider>)

    expect(await screen.findByText('Global ready')).toBeInTheDocument()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    })

    expect(screen.getByText('Global ready')).toBeInTheDocument()
    expect(screen.queryByText('Global loading')).not.toBeInTheDocument()

    await act(async () => {
      resolveAuthentication?.(null)
      await Promise.resolve()
    })

    expect(await screen.findByText('invalid_credentials')).toBeInTheDocument()
    expect(localStorage.getItem(LAST_SIGNED_IN_IDENTIFIER_KEY)).toBeNull()
  })

  it('replaces the remembered identifier only after a successful sign-in', async () => {
    localStorage.setItem(LAST_SIGNED_IN_IDENTIFIER_KEY, 'Thaweesak')
    authenticateUser.mockResolvedValue({
      token: 'admin-session-token-1234567890',
      user: {
        id: 1,
        // Backend canonical username may differ from the identifier typed into
        // the form. Remember the successful input, not this display identity.
        username: 'Thaweesak',
        email: 'admin@example.test',
        full_name: 'Administrator',
        rank: null,
        role: 'admin',
        is_active: true,
        avatar_path: null,
        avatar_updated_at: null,
        avatar_mime: null,
        avatar_size: null,
        created_at: null,
        updated_at: null,
        must_change_password: false,
      },
    })

    render(<AuthProvider><SignInProbe identifier="Admin" /></AuthProvider>)
    expect(await screen.findByText('Global ready')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('success')).toBeInTheDocument()
    expect(localStorage.getItem(LAST_SIGNED_IN_IDENTIFIER_KEY)).toBe('Admin')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(localStorage.getItem(LAST_SIGNED_IN_IDENTIFIER_KEY)).toBe('Admin')
  })
})
