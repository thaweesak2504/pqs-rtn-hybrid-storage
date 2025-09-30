import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Activity, Edit3 } from 'lucide-react'
import Container from '../ui/Container'
import Title from '../ui/Title'
import Button from '../ui/Button'
import UserCRUDForm from '../UserCRUDForm'
import { checkDatabaseHealth } from '../../services/database'

const DashboardPage: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const navigate = useNavigate()

  // Check database health on component mount
  useEffect(() => {
    const checkDB = async () => {
      try {
        // Check database health (database already initialized in App.tsx)
        const isHealthy = await checkDatabaseHealth()
        setDbStatus(isHealthy ? 'connected' : 'error')
      } catch (error) {
        console.error('Database health check failed:', error)
        setDbStatus('error')
      }
    }

    checkDB()
  }, [])

  // Listen for global avatar update events to refresh UserCRUDForm
  useEffect(() => {
    const handleAvatarUpdate = () => {
      // Force re-render of UserCRUDForm by updating a dummy state
      setDbStatus(prev => prev)
    }

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }
  }, [])

  return (
    <Container size="large" padding="large" className="py-12 sm:py-20">
      {/* Header */}
      <Title
        title="PQS RTN Dashboard"
        subtitle="ยินดีต้อนรับสู่ระบบจัดการ PQS กองทัพเรือ"
        size="medium"
        align="center"
        className="mb-8"
      />
        
      {/* Database Status */}
      <div className="text-center mt-4">
        {dbStatus === 'checking' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-github-bg-warning text-github-text-primary rounded-full text-sm">
            <div className="w-2 h-2 bg-github-accent-warning rounded-full animate-pulse"></div>
            กำลังเชื่อมต่อฐานข้อมูล...
          </div>
        )}
        {dbStatus === 'connected' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-github-bg-success text-github-text-primary rounded-full text-sm">
            <div className="w-2 h-2 bg-github-accent-success rounded-full"></div>
            เชื่อมต่อฐานข้อมูลสำเร็จ
          </div>
        )}
        {dbStatus === 'error' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-github-bg-danger text-github-text-primary rounded-full text-sm">
            <div className="w-2 h-2 bg-github-accent-danger rounded-full"></div>
            เชื่อมต่อฐานข้อมูลล้มเหลว
          </div>
        )}
      </div>

      {/* User Management Section */}
      {dbStatus === 'connected' && (
        <div className="mb-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button
              variant="primary"
              size="medium"
              onClick={() => navigate('/dashboard/database')}
              className="w-full"
              icon={<Database className="w-4 h-4" />}
              iconPosition="left"
            >
              Database Viewer
            </Button>
            <Button
              variant="primary"
              size="medium"
              onClick={() => navigate('/dashboard/performance')}
              className="w-full"
              icon={<Activity className="w-4 h-4" />}
              iconPosition="left"
            >
              Performance Test
            </Button>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-github-text-primary mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              User Management Form
            </h3>
            <UserCRUDForm />
          </div>
        </div>
      )}

      {/* Coming Soon Message (when DB is not connected) */}
      {dbStatus !== 'connected' && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="bg-github-bg-primary border border-github-border-primary rounded-lg p-8 max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-github-bg-info rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-github-accent-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-github-text-primary mb-2">
                กำลังเตรียมความพร้อม
              </h2>
              <p className="text-sm text-github-text-secondary">
                ระบบกำลังได้รับการพัฒนาเพื่อรองรับ SQLite Database
              </p>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export default DashboardPage
