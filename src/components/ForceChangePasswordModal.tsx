import React, { useState } from 'react'
import { Lock, ShieldAlert, CheckCircle } from 'lucide-react'
import Modal from './ui/Modal'
import { FormInput, FormGroup, FormActions, Button } from './ui'
import { changePassword as changePasswordApi } from '../services/userService'
import { useAuth } from '../hooks/useAuth'

/**
 * Client-side mirror of the backend `validate_password_strength` rules.
 *
 * Kept deliberately in sync with `src-tauri/src/auth.rs::validate_password_strength`
 * so users get immediate feedback before the IPC round-trip. The backend
 * remains the source of truth — if these diverge, the backend will still
 * reject a bad password with its own error message.
 */
const WEAK_PASSWORDS = [
  'admin',
  'password',
  '12345678',
  'qwerty',
  'qwerty12',
  '00000000',
  '11111111',
  'admin123',
  'password1',
]

function validatePasswordClient(password: string, username?: string): string | null {
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return 'รหัสผ่านนี้อ่อนเกินไป กรุณาเลือกรหัสผ่านที่คาดเดายาก'
  }
  if (username && username.length > 0 && password.toLowerCase() === username.toLowerCase()) {
    return 'รหัสผ่านต้องไม่เหมือนกับ Username'
  }
  return null
}

/**
 * ForceChangePasswordModal — a non-dismissible modal shown when the currently
 * authenticated user has `must_change_password === true` (e.g. the seeded
 * default admin on first login).
 *
 * Design decisions:
 * - Backdrop click + Escape + close button are all disabled — the user CANNOT
 *   dismiss this modal without completing the change.
 * - We intentionally do NOT provide a "sign out" escape hatch here; the
 *   intent is that once logged in with `must_change_password`, the user
 *   must set a strong password before doing anything else. If they truly
 *   want out, they can close the app.
 * - Client-side validation mirrors the backend for immediate feedback, but
 *   the backend (`change_password` tauri command) remains authoritative.
 */
const ForceChangePasswordModal: React.FC = () => {
  const { user, markPasswordChanged } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
    general?: string
  }>({})

  const shouldShow = !!user && user.must_change_password === true

  if (!shouldShow) return null

  const clearFieldError = (field: keyof typeof errors) => {
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: undefined, general: undefined }))
    }
  }

  const validate = (): boolean => {
    const next: typeof errors = {}

    if (!currentPassword) {
      next.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน'
    }

    const strengthError = validatePasswordClient(newPassword, user?.username)
    if (!newPassword) {
      next.newPassword = 'กรุณากรอกรหัสผ่านใหม่'
    } else if (strengthError) {
      next.newPassword = strengthError
    } else if (newPassword === currentPassword) {
      next.newPassword = 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านปัจจุบัน'
    }

    if (!confirmPassword) {
      next.confirmPassword = 'กรุณายืนยันรหัสผ่านใหม่'
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = 'รหัสผ่านยืนยันไม่ตรงกัน'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return
    if (!user?.id) {
      setErrors({ general: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await changePasswordApi(Number(user.id), currentPassword, newPassword)
      setIsSuccess(true)
      // Brief success state before unblocking the UI — gives user feedback
      // that the change was accepted.
      setTimeout(() => {
        markPasswordChanged()
      }, 800)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Route backend error to the most specific field when possible.
      if (message.toLowerCase().includes('current password')) {
        setErrors({ currentPassword: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
      } else if (
        message.toLowerCase().includes('at least 8') ||
        message.toLowerCase().includes('too common') ||
        message.toLowerCase().includes('same as the username')
      ) {
        setErrors({ newPassword: message })
      } else if (message.toLowerCase().includes('different from the current')) {
        setErrors({ newPassword: 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านปัจจุบัน' })
      } else {
        setErrors({ general: `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${message}` })
      }
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={shouldShow}
      // These three handlers are intentionally no-ops — the modal cannot be
      // dismissed without completing the password change.
      onClose={() => {}}
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      size="md"
      title="ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน"
    >
      <div className="space-y-4">
        <div
          role="alert"
          className="flex items-start space-x-3 p-3 border border-github-border-primary rounded-lg bg-github-bg-secondary"
        >
          <ShieldAlert className="w-5 h-5 text-github-accent-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm text-github-text-secondary">
            <p className="text-github-text-primary font-medium mb-1">
              เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งานระบบ
            </p>
            <p>
              บัญชีนี้ใช้รหัสผ่านเริ่มต้นที่เผยแพร่ต่อสาธารณะ
              คุณต้องตั้งรหัสผ่านใหม่ที่คาดเดายากก่อนจึงจะสามารถใช้งานต่อได้
            </p>
          </div>
        </div>

        {isSuccess && (
          <div
            role="status"
            className="flex items-start space-x-3 p-3 border border-github-border-primary rounded-lg bg-github-bg-success"
          >
            <CheckCircle className="w-5 h-5 text-github-accent-success mt-0.5 flex-shrink-0" />
            <span className="text-sm text-github-text-primary">
              เปลี่ยนรหัสผ่านสำเร็จ กำลังนำคุณเข้าสู่ระบบ...
            </span>
          </div>
        )}

        {errors.general && (
          <div
            role="alert"
            className="p-3 border border-github-border-primary rounded-lg text-sm text-github-accent-danger"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="force-change-password-form">
          <FormGroup>
            <FormInput
              name="currentPassword"
              type="password"
              label="รหัสผ่านปัจจุบัน"
              placeholder="กรอกรหัสผ่านปัจจุบัน"
              icon={Lock}
              value={currentPassword}
              onChange={e => {
                setCurrentPassword(e.target.value)
                clearFieldError('currentPassword')
              }}
              disabled={isSubmitting || isSuccess}
              error={errors.currentPassword}
              showPassword={showCurrent}
              onTogglePassword={() => setShowCurrent(v => !v)}
            />

            <FormInput
              name="newPassword"
              type="password"
              label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
              placeholder="กรอกรหัสผ่านใหม่"
              icon={Lock}
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value)
                clearFieldError('newPassword')
              }}
              disabled={isSubmitting || isSuccess}
              error={errors.newPassword}
              showPassword={showNew}
              onTogglePassword={() => setShowNew(v => !v)}
            />

            <FormInput
              name="confirmPassword"
              type="password"
              label="ยืนยันรหัสผ่านใหม่"
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              icon={Lock}
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value)
                clearFieldError('confirmPassword')
              }}
              disabled={isSubmitting || isSuccess}
              error={errors.confirmPassword}
              showPassword={showConfirm}
              onTogglePassword={() => setShowConfirm(v => !v)}
            />
          </FormGroup>

          <FormActions>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              loading={isSubmitting}
              disabled={isSubmitting || isSuccess}
              fullWidth
            >
              {isSubmitting ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
            </Button>
          </FormActions>
        </form>
      </div>
    </Modal>
  )
}

export default ForceChangePasswordModal
