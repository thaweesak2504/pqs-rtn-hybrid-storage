import React from 'react'
import Container from '../ui/Container'
import RegistrationForm from '../forms/RegistrationForm'

const RegistrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-github-bg-primary via-github-bg-secondary to-github-bg-primary">
      <Container size="large" padding="large" className="py-16">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <RegistrationForm />
        </div>
      </Container>
    </div>
  )
}

export default RegistrationPage
