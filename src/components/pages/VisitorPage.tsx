import React, { useState } from 'react'
import Container from '../ui/Container'
import { useAuth } from '../../hooks/useAuth'
import Introduction100 from '../../../example/section_100/Introduction100'
import Introduction200 from '../../../example/section_200/Introduction200'
import Introduction300 from '../../../example/section_300/Introduction300'
import IntroductionPqs from '../../../example/section_001/IntroductionPqs'
import Precautions101 from '../../../example/section_100/101Precautions'
import OrdnanceSafety102 from '../../../example/section_100/102OrdnanceSafety'
import Abbreviation103 from '../../../example/section_100/103Abbreviation'
import CiwsBasic104 from '../../../example/section_100/104CiwsBasic'
import { BookOpen, Home } from 'lucide-react'

const VisitorPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'home' | 'introductionPqs' | 'introduction100' | 'introduction200' | 'introduction300' | 'precautions101' | 'ordnanceSafety102' | 'abbreviation103' | 'ciwsBasic104'>('home')

  const renderContent = () => {
    switch (activeTab) {
      case 'introductionPqs':
        return <IntroductionPqs />
      case 'introduction100':
        return <Introduction100 />
      case 'introduction200':
        return <Introduction200 />
      case 'introduction300':
        return <Introduction300 />
      case 'precautions101':
        return <Precautions101 />
      case 'ordnanceSafety102':
        return <OrdnanceSafety102 />
      case 'abbreviation103':
        return <Abbreviation103 />
      case 'ciwsBasic104':
        return <CiwsBasic104 />
      case 'home':
      default:
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
                This is your dedicated page. Select a topic from the menu to begin.
              </p>
            </div>
          </Container>
        )
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Adjust height based on your header height */}
      {/* Left Side Panel */}
      <aside className="w-64 bg-github-bg-secondary border-r border-github-border-primary flex-shrink-0 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-github-text-secondary uppercase tracking-wider mb-4">
            Menu
          </h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'home'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <Home className="mr-3 h-5 w-5" />
              Home
            </button>
            <button
              onClick={() => setActiveTab('introductionPqs')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introductionPqs'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Introduction Pqs
            </button>
            <button
              onClick={() => setActiveTab('introduction100')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction100'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Introduction 100
            </button>
            <button
              onClick={() => setActiveTab('introduction200')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction200'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Introduction 200
            </button>
            <button
              onClick={() => setActiveTab('introduction300')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction300'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Introduction 300
            </button>
            <button
              onClick={() => setActiveTab('precautions101')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'precautions101'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              101 Precautions
            </button>
            <button
              onClick={() => setActiveTab('ordnanceSafety102')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ordnanceSafety102'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              102 Ordnance Safety
            </button>
            <button
              onClick={() => setActiveTab('abbreviation103')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'abbreviation103'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              103 Abbreviations
            </button>
            <button
              onClick={() => setActiveTab('ciwsBasic104')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ciwsBasic104'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              104 Basic CIWS System
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-github-bg-primary relative">
        {renderContent()}
      </main>
    </div>
  )
}

export default VisitorPage
