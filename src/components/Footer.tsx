import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Info, Sparkles } from 'lucide-react'
import AboutDialog from './AboutDialog'

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const [showAbout, setShowAbout] = useState(false)

  const handleContactClick = () => {
    navigate('/contact')
  }

  const handleAboutClick = () => {
    setShowAbout(true)
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

            {/* Right Section: Developer Attribution */}
            <div className="text-xs font-light text-right hidden md:block flex-shrink min-w-0">
              <p className="text-github-text-secondary font-light flex items-center justify-end gap-2 truncate">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">พัฒนาโดย กองทัพเรือ</span>
              </p>
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
