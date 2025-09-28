import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Mail, 
  Phone, 
  Send, 
  User, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  X
} from 'lucide-react'
import { Title, Container, Button, Card, FormInput, FormTextarea, FormGroup, FormRow, FormActions, CustomSelect } from '../ui'
import navyLogo from '../../assets/images/navy_logo.webp'

const ContactPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle cancel (go back to previous page or home)
  const handleCancel = () => {
    // Try to go back to previous page, fallback to home
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/home')
    }
  }

  // Check if form has any input
  const hasFormInput = formData.name || formData.email || formData.phone || formData.subject || formData.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Here you would typically send the data to your backend
      setSubmitStatus('success')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const subjectOptions = [
    'General Inquiry',
    'Technical Support',
    'Business Partnership',
    'Job Opportunities',
    'Feedback',
    'Other'
  ]

  return (
    <Container size="large" padding="large" className="py-12 sm:py-20">
      {/* Navy Logo */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img 
            src={navyLogo} 
            alt="PQS RTN Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Page Header */}
      <Title
        title="Contact Us"
        subtitle="Get in touch with our team"
        size="large"
        align="center"
        className="mb-12"
      />

      {/* Contact Form */}
      <div className="max-w-2xl mx-auto">
        <Card variant="elevated" className="p-6">
          {submitStatus === 'success' && (
            <div className="mb-4 p-3 rounded-lg bg-github-bg-success border border-github-border-primary">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-github-accent-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-github-text-primary">
                    ส่งข้อความสำเร็จ
                  </h4>
                  <p className="text-xs text-github-text-secondary">
                    ข้อความของคุณถูกส่งเรียบร้อยแล้ว
                  </p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-4 p-3 rounded-lg bg-github-bg-danger border border-github-border-primary">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-github-accent-danger mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-github-text-primary">
                    เกิดข้อผิดพลาด
                  </h4>
                  <p className="text-xs text-github-text-secondary">
                    ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormRow>
                <FormInput
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  label="Full Name"
                  placeholder="Enter your full name"
                  icon={User}
                  required
                />
                
                <FormInput
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  label="Email Address"
                  placeholder="Enter your email address"
                  type="email"
                  icon={Mail}
                  required
                />
              </FormRow>

              <FormRow>
                <FormInput
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  type="tel"
                  icon={Phone}
                />
                
                <CustomSelect
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  label="Subject"
                  placeholder="Select a subject"
                  icon={MessageSquare}
                  options={subjectOptions.map(option => ({ value: option, label: option }))}
                  required
                />
              </FormRow>

              <FormTextarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                label="Message"
                placeholder="Tell us more about your inquiry..."
                icon={MessageSquare}
                required
                rows={4}
              />
            </FormGroup>

            {/* Submit and Cancel Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              {hasFormInput && (
                <Button
                  type="button"
                  variant="outline"
                  size="medium"
                  icon={<X className="w-4 h-4" />}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="medium"
                icon={<Send className="w-4 h-4" />}
                loading={isSubmitting}
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </Container>
  )
}

export default ContactPage
