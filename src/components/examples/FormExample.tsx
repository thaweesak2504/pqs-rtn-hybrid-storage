import React, { useState } from 'react'
import { User, Mail, Phone, MessageSquare, Briefcase } from 'lucide-react'
import { 
  FormInput, 
  FormTextarea, 
  FormGroup, 
  FormRow, 
  FormActions,
  Button,
  Card,
  CustomSelect
} from '../ui'

const FormExample: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    rank: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  const rankOptions = [
    { value: 'จ.ต.', label: 'จ.ต.' },
    { value: 'จ.ท.', label: 'จ.ท.' },
    { value: 'จ.อ.', label: 'จ.อ.' },
    { value: 'จ.ส.', label: 'จ.ส.' },
    { value: 'จ.ช.', label: 'จ.ช.' }
  ]

  const subjectOptions = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'business', label: 'Business Partnership' },
    { value: 'feedback', label: 'Feedback' }
  ]

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-github-text-primary mb-6">
        Form Components Example
      </h2>
      
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
              error={errors.name}
            />
            
            <FormInput
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              label="Email Address"
              placeholder="Enter your email"
              type="email"
              icon={Mail}
              required
              error={errors.email}
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
              error={errors.phone}
            />
            
            <CustomSelect
              name="rank"
              value={formData.rank}
              onChange={handleInputChange}
              label="Rank"
              placeholder="Select rank"
              icon={Briefcase}
              options={rankOptions}
              error={errors.rank}
            />
          </FormRow>

          <CustomSelect
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            label="Subject"
            placeholder="Select a subject"
            icon={MessageSquare}
            options={subjectOptions}
            required
            error={errors.subject}
          />

          <FormTextarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            label="Message"
            placeholder="Tell us more about your inquiry..."
            icon={MessageSquare}
            required
            rows={4}
            error={errors.message}
          />
        </FormGroup>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
          >
            Submit
          </Button>
        </FormActions>
      </form>
    </Card>
  )
}

export default FormExample
