import React from 'react'
import Container from '../ui/Container'
import { useAuth } from '../../hooks/useAuth'

const EditorPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <Container size="medium" padding="large" className="py-12 sm:py-20">
      <div className="text-center">
        <div className="mb-8">
          <img 
            src="/src/assets/images/navy_logo.webp" 
            alt="Navy Logo" 
            className="mx-auto h-24 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-github-text-primary">
          Welcome Editor {user?.username}
        </h1>
        <p className="mt-4 text-github-text-secondary">
          You have special editing privileges here.
        </p>
      </div>
    </Container>
  )
}

export default EditorPage
