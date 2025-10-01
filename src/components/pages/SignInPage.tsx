import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import Container from '../ui/Container'
import { FormInput, FormGroup, FormActions, Button } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import navyLogo from '../../assets/images/navy_logo.webp'

const SignInPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  // const location = useLocation()
  // const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'
  const [formKey, setFormKey] = useState(0) // Force re-render key
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSuccess, setIsSuccess] = useState(false)

  // Reset form state when component mounts or user signs out
  useEffect(() => {
    setFormData({
      usernameOrEmail: '',
      password: ''
    })
    setShowPassword(false)
    setIsLoading(false)
    setErrors({})
    setIsSuccess(false)
    // Force re-render to fix input focus issues
    setFormKey(prev => prev + 1)
  }, [])

  // Listen for auth state changes to force re-render
  useEffect(() => {
    const handleAuthChange = () => {
      setFormKey(prev => prev + 1)
    }
    
    // Listen for storage changes (when users are deleted)
    window.addEventListener('storage', handleAuthChange)
    
    return () => {
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'กรุณากรอก Username หรือ Email'
    } else if (!isValidEmail(formData.usernameOrEmail) && formData.usernameOrEmail.length < 3) {
      newErrors.usernameOrEmail = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร หรือ Email ไม่ถูกต้อง'
    }

    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน'
    } else if (formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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
        username_or_email: formData.usernameOrEmail,
        password: formData.password
      })
      
      if (result.success) {
        setIsSuccess(true)
        
        // Redirect based on user role
        const redirectPath = result.user?.role === 'admin' ? '/dashboard' : 
                            result.user?.role === 'editor' ? '/editor' : '/visitor'
        setTimeout(() => {
          navigate(redirectPath, { replace: true })
        }, 1000)
      } else {
        setErrors({
          general: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
        })
      }
      
  } catch (error) {
      console.error('Sign In Error:', error)
      setErrors({
        general: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
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

        {/* Success Message */}
        {isSuccess && (
          <div className="mb-6 p-4 bg-github-bg-success border border-github-border-primary rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-github-accent-success mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-github-text-primary font-medium">
                  เข้าสู่ระบบสำเร็จ
                </span>
                <p className="text-sm text-github-text-secondary mt-1">
                  ยินดีต้อนรับสู่ระบบ PQS RTN
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="mb-6 p-4 border border-github-border-primary rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-github-accent-warning mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-github-text-primary">
                  ข้อมูลไม่ถูกต้อง
                </span>
                <p className="text-sm text-github-text-secondary mt-1">
                  กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form key={formKey} onSubmit={handleSignIn}>
          <FormGroup>
            <FormInput
              name="usernameOrEmail"
              value={formData.usernameOrEmail}
              onChange={handleInputChange}
              label="Username หรือ Email"
              placeholder="กรอก Username หรือ Email"
              type="text"
              icon={Mail}
              disabled={isLoading}
              error={errors.usernameOrEmail}
            />
            
            <FormInput
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
            >
              สมัครสมาชิก
            </button>
            {' '}•{' '}
            <button 
              className="text-github-accent-primary hover:text-github-accent-secondary font-medium"
              onClick={() => {
                // TODO: Navigate to forgot password page
              }}
            >
              ลืมรหัสผ่าน?
            </button>
          </p>
        </div>

        {/* Exit Button */}
        <div className="mt-6 text-center">
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
      </div>
    </Container>
  )
}

export default SignInPage
