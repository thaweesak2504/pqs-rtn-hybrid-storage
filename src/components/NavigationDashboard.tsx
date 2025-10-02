import React, { useState, useMemo } from 'react'
import { 
  BarChart3, 
  Settings, 
  Eye, 
  EyeOff,
  Download,
  Trash2,
  RotateCcw,
  X
} from 'lucide-react'
import { useNavigationAnalytics } from '../hooks/useNavigationAnalytics'
import { useResponsiveNavigation } from '../hooks/useResponsiveNavigation'
import { useNavigationHistory } from '../hooks/useNavigationHistory'

interface NavigationDashboardProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Navigation Dashboard component for analytics and controls
 * Provides insights into navigation patterns and system controls
 */
const NavigationDashboard: React.FC<NavigationDashboardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'shortcuts' | 'settings'>('analytics')
  
  // Hooks
  const { 
    stats, 
    events, 
    clearAnalytics, 
    exportAnalytics, 
    isTrackingEnabled, 
    setTrackingEnabled 
  } = useNavigationAnalytics()
  
  const { isMobile, isTablet, screenWidth, screenHeight } = useResponsiveNavigation()
  const { history, canGoBack } = useNavigationHistory()

  // Memoized analytics data
  const analyticsData = useMemo(() => {
    const totalEvents = events.length
    const sessionDuration = Date.now() - (events[0]?.timestamp || Date.now())
    const eventsPerMinute = totalEvents > 0 ? (totalEvents / (sessionDuration / 60000)).toFixed(2) : '0'
    
    return {
      totalEvents,
      sessionDuration: Math.round(sessionDuration / 1000),
      eventsPerMinute
    }
  }, [events])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-github-bg-primary rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-github-border-primary">
          <h2 className="text-2xl font-bold text-github-text-primary flex items-center space-x-2">
            <BarChart3 className="w-6 h-6" />
            <span>Navigation Dashboard</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-github-bg-hover focus:outline-none focus:ring-2 focus:ring-github-accent-primary"
            aria-label="Close dashboard"
          >
            <X className="w-5 h-5 text-github-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-github-border-primary">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-github-accent-primary text-github-text-primary'
                  : 'border-transparent text-github-text-secondary hover:text-github-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-github-bg-secondary p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-github-text-secondary mb-2">Total Page Views</h3>
                  <p className="text-2xl font-bold text-github-text-primary">{stats.totalPageViews}</p>
                </div>
                <div className="bg-github-bg-secondary p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-github-text-secondary mb-2">Menu Clicks</h3>
                  <p className="text-2xl font-bold text-github-text-primary">{stats.totalMenuClicks}</p>
                </div>
                <div className="bg-github-bg-secondary p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-github-text-secondary mb-2">Session Duration</h3>
                  <p className="text-2xl font-bold text-github-text-primary">{analyticsData.sessionDuration}s</p>
                </div>
              </div>

              {/* Most Visited Pages */}
              <div className="bg-github-bg-secondary p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-github-text-primary mb-4">Most Visited Pages</h3>
                <div className="space-y-2">
                  {stats.mostVisitedPages.map((page) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <span className="text-github-text-secondary">{page.path}</span>
                      <span className="text-github-text-primary font-medium">{page.count} visits</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-github-bg-secondary p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-github-text-primary mb-4">Recent Activity</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {stats.userJourney.slice(-10).map((event) => (
                    <div key={event.id} className="flex items-center justify-between text-sm">
                      <span className="text-github-text-secondary">{event.label}</span>
                      <span className="text-github-text-tertiary">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={exportAnalytics}
                  className="flex items-center space-x-2 px-4 py-2 bg-github-accent-primary text-white rounded-lg hover:bg-github-accent-hover transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
                <button
                  onClick={clearAnalytics}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Tracking Settings */}
              <div className="bg-github-bg-secondary p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-github-text-primary mb-4">Analytics Settings</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-github-text-secondary" />
                    <span className="text-github-text-primary">Enable Analytics Tracking</span>
                  </div>
                  <button
                    onClick={() => setTrackingEnabled(!isTrackingEnabled)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                      isTrackingEnabled
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    {isTrackingEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{isTrackingEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              {/* Device Info */}
              <div className="bg-github-bg-secondary p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-github-text-primary mb-4">Device Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-github-text-secondary">Screen Size:</span>
                    <span className="text-github-text-primary ml-2">{screenWidth} × {screenHeight}</span>
                  </div>
                  <div>
                    <span className="text-github-text-secondary">Device Type:</span>
                    <span className="text-github-text-primary ml-2">
                      {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                    </span>
                  </div>
                  <div>
                    <span className="text-github-text-secondary">Navigation History:</span>
                    <span className="text-github-text-primary ml-2">{history.length} items</span>
                  </div>
                  <div>
                    <span className="text-github-text-secondary">Can Go Back:</span>
                    <span className="text-github-text-primary ml-2">{canGoBack ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Reset Settings */}
              <div className="bg-github-bg-secondary p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-github-text-primary mb-4">Reset Settings</h3>
                <button
                  onClick={() => {
                    setTrackingEnabled(true)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-github-accent-primary text-white rounded-lg hover:bg-github-accent-hover transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NavigationDashboard
