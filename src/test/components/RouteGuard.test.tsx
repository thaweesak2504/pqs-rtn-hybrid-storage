import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RouteGuard from '../../components/auth/RouteGuard'
import { AuthContext, type AuthContextType } from '../../contexts/AuthContext'

const buildContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  checkAuthStatus: vi.fn(),
  updateAvatar: vi.fn(),
  markPasswordChanged: vi.fn(),
  ...overrides,
})

const renderGuard = (context: AuthContextType, allowedRoles?: Array<'admin' | 'editor' | 'visitor'>) => {
  render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<RouteGuard allowedRoles={allowedRoles} />}>
            <Route path="/private" element={<div>Private page</div>} />
          </Route>
          <Route path="/signin" element={<div>Sign in page</div>} />
          <Route path="/welcome" element={<div>Welcome page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RouteGuard', () => {
  it('shows a non-verbal waiting state while checking the session', () => {
    renderGuard(buildContext({ isLoading: true }))
    expect(screen.getByRole('status', { name: 'กำลังตรวจสอบสิทธิ์ผู้ใช้' })).toBeInTheDocument()
    expect(screen.getByText('กำลังตรวจสอบสิทธิ์ผู้ใช้')).toHaveClass('sr-only')
    expect(screen.queryByText('Sign in page')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to sign in', () => {
    renderGuard(buildContext())
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })

  it('allows an authenticated user with an accepted role', () => {
    renderGuard(buildContext({
      isAuthenticated: true,
      user: { id: '1', username: 'editor', email: 'editor@test', name: 'Editor', role: 'editor' },
    }), ['admin', 'editor'])

    expect(screen.getByText('Private page')).toBeInTheDocument()
  })

  it('redirects a user without the required role', () => {
    renderGuard(buildContext({
      isAuthenticated: true,
      user: { id: '2', username: 'visitor', email: 'visitor@test', name: 'Visitor', role: 'visitor' },
    }), ['admin'])

    expect(screen.getByText('Welcome page')).toBeInTheDocument()
  })
})
