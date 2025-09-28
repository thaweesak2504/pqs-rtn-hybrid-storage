import React from 'react'
import Container from '../ui/Container'
import { useAuth } from '../../hooks/useAuth'

const VisitorPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <Container size="medium" padding="large" className="py-12 sm:py-20">
      <div className="text-center">
        <div className="mb-8">
          <img 
            src="/src/assets/images/usnavy_logo.webp" 
            alt="US Navy Logo" 
            className="mx-auto h-24 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-github-text-primary">
          Welcome Visitor {user?.username}
        </h1>
        <p className="mt-4 text-github-text-secondary">
          This is your dedicated page.
        </p>
      </div>
    </Container>
  )
}

export default VisitorPage
