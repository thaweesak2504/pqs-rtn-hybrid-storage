import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from './ui'
import { Mail, Info } from 'lucide-react'

const Footer: React.FC = () => {
  const navigate = useNavigate()

  const handleContactClick = () => {
    navigate('/contact')
  }

  return (
    <footer className="bg-github-bg-primary border-t border-github-border-primary py-3 transition-colors duration-200">
      <Container size="large" padding="medium">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
          
          {/* Left Section: Copyright */}
          <div className="text-sm space-y-1">
            <p className="text-github-text-secondary">
              © 2025 Royal Thai Navy - สงวนลิขสิทธิ์ทุกประการ
            </p>
            <p className="text-github-text-secondary text-xs">
              พัฒนาโดย กองทัพเรือ เพื่อการปฏิบัติงานที่มีประสิทธิภาพ
            </p>
          </div>
          
          {/* Right Section: Navigation Links */}
          <div className="flex flex-wrap justify-end gap-6 text-sm">
            <button 
              onClick={handleContactClick}
              className="flex items-center space-x-2 text-github-text-secondary hover:text-github-accent-primary hover:translate-y-[-2px] transition-all duration-200"
            >
              <Mail className="w-4 h-4" />
              <span>ติดต่อเรา</span>
            </button>
            <button 
              onClick={() => {
                // TODO: เพิ่มหน้าข้อมูลสำคัญในอนาคต
              }}
              className="flex items-center space-x-2 text-github-text-secondary hover:text-github-accent-primary hover:translate-y-[-2px] transition-all duration-200"
            >
              <Info className="w-4 h-4" />
              <span>ข้อมูลสำคัญ</span>
            </button>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
