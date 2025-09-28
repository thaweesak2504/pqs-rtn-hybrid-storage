import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, X, User, Mail, Lock, Shield, UserPlus, ChevronDown } from 'lucide-react'
import { createUserAccount } from '../../services/authService'
import { useAuth } from '../../hooks/useAuth'
import { Button, Card, Title, Alert, FormInput, FormSelect, FormGroup, FormRow, FormActions, CustomSelect } from '../ui'
import { useToast } from '../../contexts/ToastContext'
import navyLogo from '../../assets/images/navy_logo.webp'

interface RegistrationFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  fullName: string
  rank: string
}

interface PasswordValidation {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

const RegistrationForm: React.FC = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState<RegistrationFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    rank: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Password validation
  const validatePassword = (password: string): PasswordValidation => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  })

  const passwordValidation = validatePassword(formData.password)
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  // Reset form state when component mounts
  useEffect(() => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      rank: ''
    })
    setIsLoading(false)
    setError(null)
    setSuccess(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.username.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้')
      return
    }
    if (!formData.email.trim()) {
      setError('กรุณากรอกอีเมล')
      return
    }
    if (!isPasswordValid) {
      setError('รหัสผ่านไม่ตรงตามข้อกำหนด')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }

    setIsLoading(true)

    try {
      const result = await createUserAccount({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        rank: formData.rank || undefined,
        role: 'visitor' // Default role
      })

      if (result.success && result.user) {
        setSuccess('ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...')
        showSuccess('ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...')
        
        // Auto-login after successful registration
        const loginResult = await signIn({
          username_or_email: formData.username,
          password: formData.password
        })
        
        if (loginResult.success) {
          // Redirect based on user role
          const redirectPath = result.user.role === 'admin' ? '/dashboard' : 
                              result.user.role === 'editor' ? '/editor' : '/visitor'
          navigate(redirectPath)
        } else {
          setError('ลงทะเบียนสำเร็จ แต่เข้าสู่ระบบไม่ได้ กรุณาลองเข้าสู่ระบบด้วยตนเอง')
          showError('ลงทะเบียนสำเร็จ แต่เข้าสู่ระบบไม่ได้ กรุณาลองเข้าสู่ระบบด้วยตนเอง')
          setTimeout(() => {
            navigate('/signin')
          }, 2000)
        }
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการลงทะเบียน')
        showError(result.error || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการลงทะเบียน')
      showError('เกิดข้อผิดพลาดในการลงทะเบียน')
      console.error('Registration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        {/* Navy Logo */}
        <div className="mb-6">
          <img 
            src={navyLogo} 
            alt="PQS RTN Logo"
            className="h-16 w-auto object-contain mx-auto"
          />
        </div>
        <Title level="h1" className="text-3xl font-bold text-github-text-primary mb-2">
          สร้างบัญชีใหม่
        </Title>
        <p className="text-github-text-secondary text-lg">
          เข้าร่วมกับเราและเริ่มต้นการใช้งาน
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-github-bg-primary to-github-bg-secondary">


        <form onSubmit={handleSubmit}>
          <FormGroup>
            <FormRow>
              <FormInput
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                label="ชื่อผู้ใช้"
                placeholder="กรอกชื่อผู้ใช้"
                icon={User}
                required
              />
              
              <FormInput
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                label="อีเมล"
                placeholder="กรอกอีเมล"
                type="email"
                icon={Mail}
                required
              />
            </FormRow>

            <FormRow>
              <FormInput
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                label="ชื่อ-นามสกุล"
                placeholder="กรอกชื่อ-นามสกุล"
                icon={User}
              />
              
              <CustomSelect
                name="rank"
                value={formData.rank}
                onChange={handleInputChange}
                label="ยศ"
                placeholder="เลือกยศ"
                icon={Shield}
                options={[
                  { value: 'จ.ต.', label: 'จ.ต.' },
                  { value: 'จ.ท.', label: 'จ.ท.' },
                  { value: 'จ.อ.', label: 'จ.อ.' },
                  { value: 'พ.จ.ต.', label: 'พ.จ.ต.' },
                  { value: 'พ.จ.ท.', label: 'พ.จ.ท.' },
                  { value: 'พ.จ.อ.', label: 'พ.จ.อ.' },
                  { value: 'ร.ต.', label: 'ร.ต.' },
                  { value: 'ร.ท.', label: 'ร.ท.' },
                  { value: 'ร.อ.', label: 'ร.อ.' },
                  { value: 'น.ต.', label: 'น.ต.' },
                  { value: 'น.ท.', label: 'น.ท.' },
                  { value: 'น.อ.', label: 'น.อ.' },
                  { value: 'อื่นๆ', label: 'อื่นๆ' }
                ]}
              />
            </FormRow>

            <FormRow>
              <FormInput
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                label="รหัสผ่าน"
                placeholder="กรอกรหัสผ่าน"
                type="password"
                icon={Lock}
                required
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
              
              <FormInput
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                label="ยืนยันรหัสผ่าน"
                placeholder="ยืนยันรหัสผ่าน"
                type="password"
                icon={Lock}
                required
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </FormRow>
          </FormGroup>

          {/* Password Requirements - Single Line */}
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center">
                {passwordValidation.minLength ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <X className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}>
                  รวมอย่างน้อย 8 ตัวอักษร
                </span>
              </div>
              <div className="flex items-center">
                {passwordValidation.hasUppercase ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <X className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}>
                  พิมพ์ใหญ่
                </span>
              </div>
              <div className="flex items-center">
                {passwordValidation.hasLowercase ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <X className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}>
                  พิมพ์เล็ก
                </span>
              </div>
              <div className="flex items-center">
                {passwordValidation.hasNumber ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <X className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}>
                  ตัวเลข
                </span>
              </div>
              <div className="flex items-center">
                {passwordValidation.hasSpecialChar ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <X className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}>
                  อักขระพิเศษ
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert type="error" className="mt-4">
              {error}
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert type="success" className="mt-4">
              {success}
            </Alert>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="large"
              className="w-full justify-center py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isPasswordValid}
              icon={isLoading ? undefined : <UserPlus className="w-5 h-5 mr-2" />}
            >
              {isLoading ? 'กำลังลงทะเบียน...' : 'สร้างบัญชีใหม่'}
            </Button>
          </div>
        </form>


        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-github-text-secondary">
            มีบัญชีแล้ว?{' '}
            <button
              onClick={() => navigate('/signin')}
              className="text-github-accent-primary hover:text-github-accent-secondary font-semibold transition-colors duration-200"
            >
              เข้าสู่ระบบ
            </button>
          </p>
        </div>

        {/* Exit Button */}
        <div className="mt-4 text-center">
          <button 
            onClick={() => {
              // Try to go back to previous page, fallback to home
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/')
              }
            }}
            className="text-sm text-github-text-secondary hover:text-github-text-primary font-medium transition-colors duration-200"
          >
            Exit
          </button>
        </div>
      </Card>
    </div>
  )
}

export default RegistrationForm
