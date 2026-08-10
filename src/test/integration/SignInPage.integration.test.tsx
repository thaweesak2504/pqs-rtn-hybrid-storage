import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SignInPage from '../../components/pages/SignInPage'
import {
  AuthContext,
  LAST_SIGNED_IN_IDENTIFIER_KEY,
  type AuthContextType,
  type SignInResult,
} from '../../contexts/AuthContext'

const buildContext = (signIn: AuthContextType['signIn']): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  signIn,
  signOut: vi.fn(),
  checkAuthStatus: vi.fn(),
  updateAvatar: vi.fn(),
  markPasswordChanged: vi.fn(),
})

const renderSignIn = (signIn: AuthContextType['signIn']) => {
  render(
    <AuthContext.Provider value={buildContext(signIn)}>
      <MemoryRouter initialEntries={['/signin']}>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/welcome" element={<div>Welcome page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText('Username หรือ Email'), {
    target: { value: 'editor' },
  })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), {
    target: { value: 'wrong-password' },
  })
  fireEvent.submit(screen.getByRole('form', { name: 'แบบฟอร์มเข้าสู่ระบบ' }))
}

describe('SignInPage workflow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('prefills the last successful identifier in the standard username field', async () => {
    localStorage.setItem(LAST_SIGNED_IN_IDENTIFIER_KEY, 'remembered-editor')
    renderSignIn(vi.fn())

    expect(screen.getByLabelText('Username หรือ Email')).toHaveValue('remembered-editor')
    expect(screen.getByLabelText('Username หรือ Email')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Username หรือ Email')).toHaveAttribute('autocapitalize', 'none')
    expect(screen.getByLabelText('Username หรือ Email')).toHaveAttribute('autocorrect', 'off')
    expect(screen.getByLabelText('Username หรือ Email')).toHaveAttribute('spellcheck', 'false')
    expect(screen.getByLabelText('รหัสผ่าน')).toHaveValue('')
    await waitFor(() => expect(screen.getByLabelText('รหัสผ่าน')).toHaveFocus())
  })

  it('keeps the form mounted and explains invalid credentials', async () => {
    const signIn = vi.fn().mockResolvedValue({
      success: false,
      reason: 'invalid_credentials',
    })
    renderSignIn(signIn)

    fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('เข้าสู่ระบบไม่สำเร็จ')
    expect(alert).toHaveTextContent('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง')
    expect(screen.getByLabelText('Username หรือ Email')).toHaveValue('editor')
    expect(screen.getByLabelText('รหัสผ่าน')).toHaveValue('wrong-password')
    await waitFor(() => expect(screen.getByLabelText('รหัสผ่าน')).toHaveFocus())
  })

  it('distinguishes a system failure from invalid credentials', async () => {
    const signIn = vi.fn().mockResolvedValue({
      success: false,
      reason: 'system_error',
    })
    renderSignIn(signIn)

    fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ระบบไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ในขณะนี้ กรุณาลองอีกครั้ง',
    )
  })

  it('uses a local loading state without replacing the sign-in page', async () => {
    let resolveSignIn: ((result: SignInResult) => void) | undefined
    const signIn = vi.fn().mockReturnValue(new Promise(resolve => {
      resolveSignIn = resolve
    }))
    renderSignIn(signIn)

    fillAndSubmit()

    expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'กำลังเข้าสู่ระบบ...' })).toBeDisabled()

    resolveSignIn?.({ success: false, reason: 'invalid_credentials' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('validates required fields and focuses the first missing value', async () => {
    const signIn = vi.fn()
    renderSignIn(signIn)

    fireEvent.submit(screen.getByRole('form', { name: 'แบบฟอร์มเข้าสู่ระบบ' }))

    expect(await screen.findByText('กรุณากรอก Username หรือ Email')).toBeInTheDocument()
    expect(screen.getByText('กรุณากรอกรหัสผ่าน')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Username หรือ Email')).toHaveFocus())
  })

  it('navigates immediately after successful authentication', async () => {
    const signIn = vi.fn().mockResolvedValue({
      success: true,
      user: { id: '1', username: 'editor', email: 'editor@test', name: 'Editor', role: 'editor' },
    })
    renderSignIn(signIn)

    fillAndSubmit()

    expect(await screen.findByText('Welcome page')).toBeInTheDocument()
  })

  it('turns forgot-password into an actionable support instruction', () => {
    renderSignIn(vi.fn())

    fireEvent.click(screen.getByRole('button', { name: 'ลืมรหัสผ่าน?' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'กรุณาติดต่อผู้ดูแลระบบเพื่อยืนยันตัวตนและขอรีเซ็ตรหัสผ่าน',
    )
  })
})
