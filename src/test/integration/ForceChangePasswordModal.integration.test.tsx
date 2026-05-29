import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForceChangePasswordModal from '../../components/ForceChangePasswordModal'
import { AuthContext, type AuthContextType, type User } from '../../contexts/AuthContext'
import { changePassword as changePasswordApi } from '../../services/userService'

vi.mock('../../services/userService', () => ({
  changePassword: vi.fn(),
}))

function buildCtx(overrides: Partial<AuthContextType> = {}): AuthContextType {
  const user: User = {
    id: '42',
    username: 'admin',
    email: 'admin@pqs-rtn.local',
    name: 'System Administrator',
    role: 'admin',
    must_change_password: true,
  }
  return {
    user,
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn().mockResolvedValue({ success: true }),
    signOut: vi.fn(),
    checkAuthStatus: vi.fn(),
    updateAvatar: vi.fn(),
    markPasswordChanged: vi.fn(),
    ...overrides,
  }
}

function renderWithCtx(ctx: AuthContextType) {
  return render(
    <AuthContext.Provider value={ctx}>
      <ForceChangePasswordModal />
    </AuthContext.Provider>,
  )
}

describe('ForceChangePasswordModal', () => {
  beforeEach(() => {
    vi.mocked(changePasswordApi).mockReset()
    vi.useRealTimers()
  })

  // ── gating ──────────────────────────────────────────────────────────────

  it('renders nothing when there is no authenticated user', () => {
    renderWithCtx(buildCtx({ user: null, isAuthenticated: false }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('force-change-password-form')).not.toBeInTheDocument()
  })

  it('renders nothing when the user does not need to change password', () => {
    const ctx = buildCtx()
    ctx.user = { ...ctx.user!, must_change_password: false }
    renderWithCtx(ctx)
    expect(screen.queryByLabelText('force-change-password-form')).not.toBeInTheDocument()
  })

  it('renders the form when must_change_password is true', () => {
    renderWithCtx(buildCtx())
    expect(screen.getByLabelText('force-change-password-form')).toBeInTheDocument()
    expect(screen.getByText('ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน')).toBeInTheDocument()
  })

  // ── non-dismissibility ──────────────────────────────────────────────────

  it('has no close button (cannot be dismissed without completing)', () => {
    renderWithCtx(buildCtx())
    expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument()
  })

  it('does not close on Escape key', () => {
    const ctx = buildCtx()
    renderWithCtx(ctx)
    fireEvent.keyDown(document, { key: 'Escape' })
    // Form still present
    expect(screen.getByLabelText('force-change-password-form')).toBeInTheDocument()
    expect(ctx.markPasswordChanged).not.toHaveBeenCalled()
  })

  // ── client-side validation ──────────────────────────────────────────────

  it('shows field errors on submit with empty fields and does not call backend', () => {
    renderWithCtx(buildCtx())
    const form = screen.getByLabelText('force-change-password-form')
    fireEvent.submit(form)

    expect(screen.getByText('กรุณากรอกรหัสผ่านปัจจุบัน')).toBeInTheDocument()
    expect(screen.getByText('กรุณากรอกรหัสผ่านใหม่')).toBeInTheDocument()
    expect(screen.getByText('กรุณายืนยันรหัสผ่านใหม่')).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('rejects a new password shorter than 8 chars', () => {
    renderWithCtx(buildCtx())
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'short' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'short' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    expect(screen.getByText('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('rejects a weak common password', () => {
    renderWithCtx(buildCtx())
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'password1' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    expect(
      screen.getByText('รหัสผ่านนี้อ่อนเกินไป กรุณาเลือกรหัสผ่านที่คาดเดายาก'),
    ).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('rejects a new password equal to the username', () => {
    const ctx = buildCtx()
    ctx.user = { ...ctx.user!, username: 'administrator' }
    renderWithCtx(ctx)
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'administrator' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'administrator' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    expect(screen.getByText('รหัสผ่านต้องไม่เหมือนกับ Username')).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('rejects mismatched confirm password', () => {
    renderWithCtx(buildCtx())
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'StrongPass123' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'DifferentPass123' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    expect(screen.getByText('รหัสผ่านยืนยันไม่ตรงกัน')).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('rejects when new password equals current password', () => {
    renderWithCtx(buildCtx())
    const same = 'RepeatedPass1'
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: same },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: same },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: same },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    expect(
      screen.getByText('รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านปัจจุบัน'),
    ).toBeInTheDocument()
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  // ── success flow ────────────────────────────────────────────────────────

  it('calls backend with user id + passwords and clears the flag on success', async () => {
    vi.mocked(changePasswordApi).mockResolvedValueOnce(undefined)
    const ctx = buildCtx()
    renderWithCtx(ctx)

    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    await waitFor(() => {
      expect(changePasswordApi).toHaveBeenCalledWith(42, 'admin', 'StrongNewPass1')
    })

    // Success banner appears after resolving
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('เปลี่ยนรหัสผ่านสำเร็จ')
    })

    // After a brief delay the gate unblocks via markPasswordChanged
    await waitFor(
      () => {
        expect(ctx.markPasswordChanged).toHaveBeenCalledTimes(1)
      },
      { timeout: 2000 },
    )
  })

  // ── backend error mapping ──────────────────────────────────────────────

  it('maps "Current password is incorrect" backend error to the current-password field', async () => {
    vi.mocked(changePasswordApi).mockRejectedValueOnce(new Error('Current password is incorrect'))
    renderWithCtx(buildCtx())

    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'wrong' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    await waitFor(() => {
      expect(screen.getByText('รหัสผ่านปัจจุบันไม่ถูกต้อง')).toBeInTheDocument()
    })
  })

  it('maps "Password is too common" backend error to the new-password field', async () => {
    vi.mocked(changePasswordApi).mockRejectedValueOnce(
      new Error('Password is too common; please choose something stronger'),
    )
    renderWithCtx(buildCtx())

    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    // Client-side passes this (long + not in list), but backend rejects
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'SomeClientAllowed1' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'SomeClientAllowed1' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    await waitFor(() => {
      expect(screen.getByText(/too common/i)).toBeInTheDocument()
    })
  })

  it('shows general error for unrecognized backend failure', async () => {
    vi.mocked(changePasswordApi).mockRejectedValueOnce(new Error('Database unavailable'))
    renderWithCtx(buildCtx())

    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านปัจจุบัน'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่านใหม่อีกครั้ง'), {
      target: { value: 'StrongNewPass1' },
    })
    fireEvent.submit(screen.getByLabelText('force-change-password-form'))

    await waitFor(() => {
      expect(
        screen.getByText(/เปลี่ยนรหัสผ่านไม่สำเร็จ.*Database unavailable/),
      ).toBeInTheDocument()
    })
  })
})
