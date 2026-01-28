import React, { useState } from 'react'
import Container from '../ui/Container'
// import { useAuth } from '../../hooks/useAuth'
import ExampleCover from '../../example/section_001/ExampleCover'
import Introduction100 from '../../example/section_100/Introduction100'
import Introduction200 from '../../example/section_200/Introduction200'
import Introduction300 from '../../example/section_300/Introduction300'
import IntroductionPqs from '../../example/section_001/IntroductionPqs'
import Precautions101 from '../../example/section_100/101Precautions'
import OrdnanceSafety102 from '../../example/section_100/102OrdnanceSafety'
import Abbreviation103 from '../../example/section_100/103Abbreviation'
import CiwsBasic104 from '../../example/section_100/104CiwsBasic'
import RadarWeapon201 from '../../example/section_200/201RadarWeapon'
import Lcp202 from '../../example/section_200/202Lcp'
import Rcp203 from '../../example/section_200/203Rcp'
import Elx204 from '../../example/section_200/204Elx'
import TapeEmulator205 from '../../example/section_200/205TapeEmulator'
import Teletype206 from '../../example/section_200/206Teletype'

import { BookOpen, Home, FileText, ChevronDown, ChevronRight, Crosshair, Monitor, Radio, Zap, Disc, Printer, AlertTriangle, Shield, List } from 'lucide-react'

const VisitorPage: React.FC = () => {
  // const { user } = useAuth() // Removed authentication check
  const [activeTab, setActiveTab] = useState<'home' | 'exampleCover' | 'introductionPqs' | 'introduction100' | 'introduction200' | 'introduction300' | 'precautions101' | 'ordnanceSafety102' | 'abbreviation103' | 'ciwsBasic104' | 'radarWeapon201' | 'lcp202' | 'rcp203' | 'elx204' | 'tapeEmulator205' | 'teletype206'>('home')
  const [isSection200Open, setIsSection200Open] = useState(false)
  const [isSection100Open, setIsSection100Open] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case 'exampleCover':
        return <ExampleCover />
      case 'introductionPqs':
        return <IntroductionPqs />
      case 'introduction100':
        return <Introduction100 />
      case 'introduction200':
        return <Introduction200 />

      case 'precautions101':
        return <Precautions101 />
      case 'ordnanceSafety102':
        return <OrdnanceSafety102 />
      case 'abbreviation103':
        return <Abbreviation103 />
      case 'ciwsBasic104':
        return <CiwsBasic104 />
      case 'radarWeapon201':
        return <RadarWeapon201 />
      case 'lcp202':
        return <Lcp202 />
      case 'rcp203':
        return <Rcp203 />
      case 'elx204':
        return <Elx204 />
      case 'tapeEmulator205':
        return <TapeEmulator205 />
      case 'teletype206':
        return <Teletype206 />
      case 'introduction300':
        return <Introduction300 />

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
              Welcome Visitor
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
              onClick={() => { setActiveTab('home'); setIsSection200Open(false); setIsSection100Open(false) }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'home'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <Home className="mr-3 h-5 w-5" />
              Home
            </button>
            <button
              onClick={() => { setActiveTab('exampleCover'); setIsSection200Open(false); setIsSection100Open(false) }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'exampleCover'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <FileText className="mr-3 h-5 w-5" />
              Cover Page
            </button>
            <button
              onClick={() => { setActiveTab('introductionPqs'); setIsSection200Open(false); setIsSection100Open(false) }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introductionPqs'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Introduction Pqs
            </button>
            {/* 100 Section Dropdown */}
            <div>
              <button
                onClick={() => { setIsSection100Open(!isSection100Open); if (!isSection100Open) setIsSection200Open(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary transition-colors"
              >
                <div className="flex items-center">
                  <BookOpen className="mr-3 h-5 w-5" />
                  100 Section
                </div>
                {isSection100Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {isSection100Open && (
                <div className="pl-4 space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('introduction100')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction100'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <FileText className="mr-3 h-4 w-4" />
                    100 Introduction
                  </button>
                  <button
                    onClick={() => setActiveTab('precautions101')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'precautions101'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <AlertTriangle className="mr-3 h-4 w-4" />
                    101 Precautions
                  </button>
                  <button
                    onClick={() => setActiveTab('ordnanceSafety102')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ordnanceSafety102'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Shield className="mr-3 h-4 w-4" />
                    102 Ordnance Safety
                  </button>
                  <button
                    onClick={() => setActiveTab('abbreviation103')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'abbreviation103'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <List className="mr-3 h-4 w-4" />
                    103 Abbreviations
                  </button>
                  <button
                    onClick={() => setActiveTab('ciwsBasic104')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ciwsBasic104'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Crosshair className="mr-3 h-4 w-4" />
                    104 Basic CIWS System
                  </button>
                </div>
              )}
            </div>

            {/* 200 Section Dropdown */}
            <div>
              <button
                onClick={() => { setIsSection200Open(!isSection200Open); if (!isSection200Open) setIsSection100Open(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary transition-colors"
              >
                <div className="flex items-center">
                  <BookOpen className="mr-3 h-5 w-5" />
                  200 Section
                </div>
                {isSection200Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {isSection200Open && (
                <div className="pl-4 space-y-1 mt-1">
                  <button
                    onClick={() => setActiveTab('introduction200')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction200'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <FileText className="mr-3 h-4 w-4" />
                    200 Introduction
                  </button>
                  <button
                    onClick={() => setActiveTab('radarWeapon201')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'radarWeapon201'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Crosshair className="mr-3 h-4 w-4" />
                    201 Radar Weapon
                  </button>
                  <button
                    onClick={() => setActiveTab('lcp202')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'lcp202'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Monitor className="mr-3 h-4 w-4" />
                    202 Local Control
                  </button>
                  <button
                    onClick={() => setActiveTab('rcp203')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rcp203'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Radio className="mr-3 h-4 w-4" />
                    203 Remote Control
                  </button>
                  <button
                    onClick={() => setActiveTab('elx204')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'elx204'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Zap className="mr-3 h-4 w-4" />
                    204 Elx Enclosure
                  </button>
                  <button
                    onClick={() => setActiveTab('tapeEmulator205')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'tapeEmulator205'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Disc className="mr-3 h-4 w-4" />
                    205 Tape Emulator
                  </button>
                  <button
                    onClick={() => setActiveTab('teletype206')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'teletype206'
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                      }`}
                  >
                    <Printer className="mr-3 h-4 w-4" />
                    206 Teletype
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { setActiveTab('introduction300'); setIsSection200Open(false); setIsSection100Open(false) }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'introduction300'
                ? 'bg-github-bg-active text-github-text-primary'
                : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              300 Introduction
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
