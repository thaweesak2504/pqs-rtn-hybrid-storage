import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, HelpCircle } from 'lucide-react'
import Container from '../ui/Container'
import { FormInput, FormGroup, FormActions, Button } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { LAST_SIGNED_IN_IDENTIFIER_KEY } from '../../contexts/AuthContext'
import navyLogo from '../../assets/images/navy_logo.webp'
import { logger } from '../../utils/logger';

const SignInPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const rememberedIdentifier = useRef(localStorage.getItem(LAST_SIGNED_IN_IDENTIFIER_KEY) ?? '').current
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    usernameOrEmail: rememberedIdentifier,
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [assistanceMessage, setAssistanceMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear stale feedback as soon as the user begins correcting the form.
    setErrors(prev => ({ ...prev, [name]: '', general: '' }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'กรุณากรอก Username หรือ Email'
    }

    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน'
    }

    setErrors(newErrors)

    if (newErrors.usernameOrEmail) {
      requestAnimationFrame(() => usernameInputRef.current?.focus())
    } else if (newErrors.password) {
      requestAnimationFrame(() => passwordInputRef.current?.focus())
    }

    return Object.keys(newErrors).length === 0
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const result = await signIn({
        username_or_email: formData.usernameOrEmail.trim(),
        password: formData.password
      })

      if (result.success) {
        navigate('/welcome', { replace: true })
      } else {
        setErrors({
          general: result.reason === 'invalid_credentials'
            ? 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง'
            : 'ระบบไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ในขณะนี้ กรุณาลองอีกครั้ง'
        })
        if (result.reason === 'invalid_credentials') {
          requestAnimationFrame(() => {
            passwordInputRef.current?.focus()
            passwordInputRef.current?.select()
          })
        }
      }

    } catch (error) {
      logger.error('Sign In Error:', error)
      setErrors({
        general: 'ระบบไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ในขณะนี้ กรุณาลองอีกครั้ง'
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Container size="medium" padding="large" className="py-12 sm:py-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={navyLogo}
              alt="PQS RTN Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-github-text-primary mb-2">
            เข้าสู่ระบบ
          </h1>
          <p className="text-github-text-secondary">
            ยินดีต้อนรับสู่ระบบมาตรฐานกำลังพล
          </p>
        </div>

        {/* Error Message */}
        {errors.general && (
          <div
            className="mb-6 rounded-lg border border-github-accent-danger/60 bg-github-bg-danger/40 p-4"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle aria-hidden="true" className="w-5 h-5 text-github-accent-danger mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-github-text-primary font-medium">
                  เข้าสู่ระบบไม่สำเร็จ
                </span>
                <p className="text-sm text-github-text-secondary mt-1">
                  {errors.general}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} noValidate aria-label="แบบฟอร์มเข้าสู่ระบบ">
          <FormGroup>
            <FormInput
              ref={usernameInputRef}
              name="usernameOrEmail"
              value={formData.usernameOrEmail}
              onChange={handleInputChange}
              label="Username หรือ Email"
              placeholder="กรอก Username หรือ Email"
              type="text"
              icon={Mail}
              disabled={isLoading}
              error={errors.usernameOrEmail}
              autoComplete="username"
              autoFocus={!rememberedIdentifier}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            <FormInput
              ref={passwordInputRef}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              label="รหัสผ่าน"
              placeholder="กรอกรหัสผ่าน"
              type="password"
              icon={Lock}
              disabled={isLoading}
              error={errors.password}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="current-password"
              autoFocus={Boolean(rememberedIdentifier)}
            />

          </FormGroup>

          <FormActions>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              loading={isLoading}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </FormActions>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-github-border-primary"></div>
          <span className="px-4 text-sm text-github-text-secondary">หรือ</span>
          <div className="flex-1 border-t border-github-border-primary"></div>
        </div>


        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-github-text-secondary">
            ยังไม่มีบัญชี?{' '}
            <button
              className="text-github-accent-primary hover:text-github-accent-secondary font-medium"
              onClick={() => navigate('/register')}
              type="button"
            >
              สมัครสมาชิก
            </button>
            {' '}•{' '}
            <button
              className="text-github-accent-primary hover:text-github-accent-secondary font-medium"
              onClick={() => {
                setAssistanceMessage('กรุณาติดต่อผู้ดูแลระบบเพื่อยืนยันตัวตนและขอรีเซ็ตรหัสผ่าน')
              }}
              type="button"
            >
              ลืมรหัสผ่าน?
            </button>
          </p>
        </div>

        {assistanceMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-github-border-primary bg-github-bg-secondary p-3" role="status">
            <HelpCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-github-accent-primary" />
            <p className="text-sm text-github-text-secondary">{assistanceMessage}</p>
          </div>
        )}

        {/* Exit Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              navigate('/welcome')
            }}
            className="text-sm text-github-text-secondary hover:text-github-text-primary font-medium transition-colors duration-200"
          >
            กลับหน้าต้อนรับ
          </button>
        </div>
      </div>
    </Container>
  )
}

export default SignInPage
