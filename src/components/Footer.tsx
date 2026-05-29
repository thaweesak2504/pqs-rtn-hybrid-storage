import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Info, Sparkles, Home, History, Users } from 'lucide-react'
import AboutDialog from './AboutDialog'

// ─── Welcome Page Section Config ──────────────────────────────────────────────

interface SectionNavItem {
  id: string
  label: string
  icon: React.ReactNode
}

const WELCOME_SECTIONS: SectionNavItem[] = [
  { id: 'hero', label: 'หน้าหลัก', icon: <Home className="w-3 h-3" /> },
  { id: 'history', label: 'ประวัติ', icon: <History className="w-3 h-3" /> },
  { id: 'team', label: 'ทีมงาน', icon: <Users className="w-3 h-3" /> },
]

// ─── Component ────────────────────────────────────────────────────────────────

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAbout, setShowAbout] = useState(false)

  const isWelcomePage = location.pathname.endsWith('/welcome') || location.pathname.endsWith('/welcome/')
  const [activeSection, setActiveSection] = useState<string>('hero')

  // ── Intersection Observer: track active section on Welcome page ──────────
  useEffect(() => {
    if (!isWelcomePage) return

    const sectionIds = WELCOME_SECTIONS.map(s => s.id)
    const elements = sectionIds
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [isWelcomePage])

  const handleContactClick = () => {
    navigate('/contact')
  }

  const handleAboutClick = () => {
    setShowAbout(true)
  }

  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <footer className="footer-fixed bg-github-bg-primary border-t border-github-border-primary font-light transition-colors duration-200">
      <div className="h-full flex items-center w-full">
        <div className="w-full mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between w-full gap-4">
            
            {/* Left Section: Copyright */}
            <div className="text-xs font-light flex-shrink-0">
              <p className="text-github-text-secondary font-light truncate">
                © 2025 Royal Thai Navy
              </p>
            </div>
            
            {/* Center Section: Navigation Links */}
            <div className="flex gap-6 text-xs font-light justify-center flex-shrink-0">
              <button 
                onClick={handleContactClick}
                className="flex items-center space-x-2 text-github-text-secondary font-light hover:text-github-accent-primary hover:translate-y-[-2px] transition-all duration-200"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="font-light hidden md:inline">ติดต่อเรา</span>
              </button>
              <button 
                onClick={handleAboutClick}
                className="flex items-center space-x-2 text-github-text-secondary font-light hover:text-github-accent-primary hover:translate-y-[-2px] transition-all duration-200"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="font-light hidden md:inline">ข้อมูลสำคัญ</span>
              </button>
            </div>

            {/* Right Section: Section Nav (Welcome page only) + Developer Attribution */}
            <div className="flex items-center gap-4 text-xs font-light flex-shrink-0">
              {/* Welcome Section Navigation */}
              {isWelcomePage && (
                <div className="hidden md:flex items-center gap-1 border-r border-github-border-primary pr-4">
                  {WELCOME_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded font-light transition-all duration-200 ${
                        activeSection === section.id
                          ? 'text-github-accent-primary bg-github-bg-hover font-medium'
                          : 'text-github-text-secondary hover:text-github-accent-primary hover:bg-github-bg-hover'
                      }`}
                      type="button"
                    >
                      {section.icon}
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Developer Attribution */}
              <div className="text-right hidden md:block min-w-0">
                <p className="text-github-text-secondary font-light flex items-center justify-end gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">พัฒนาโดย กองทัพเรือ</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Dialog */}
      <AboutDialog 
        isOpen={showAbout} 
        onClose={() => setShowAbout(false)} 
      />
    </footer>
  )
}

export default Footer

