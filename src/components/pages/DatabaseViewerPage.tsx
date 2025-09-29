import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { Container, Card, Button, Title } from '../ui'
import { RefreshCw, Database, Users, Image, Eye, EyeOff } from 'lucide-react'

interface User {
  id: number
  username: string
  email: string
  password_hash: string
  full_name: string
  rank: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  avatar_updated_at?: string
  avatar_mime?: string
  avatar_size?: number
}

interface Avatar {
  id: number
  user_id: number
  avatar_path: string | null // File path instead of BLOB data
  avatar_updated_at: string | null
  avatar_mime: string | null
  avatar_size: number | null
  created_at: string
  updated_at: string
}

const DatabaseViewerPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [showPasswords, setShowPasswords] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)

  // Load data from database
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load users
      const usersData = await invoke('get_all_users') as User[]
      setUsers(usersData)

      // Load avatars
      const avatarsData = await invoke('get_all_avatars') as Avatar[]
      setAvatars(avatarsData)

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error loading database data:', error)
      // Set empty arrays on error
      setUsers([])
      setAvatars([])
    } finally {
      setIsLoading(false)
    }
  }


  // Initial load
  useEffect(() => {
    loadData()
  }, [])


  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get avatar for user
  const getUserAvatar = (userId: number) => {
    return avatars.find(avatar => avatar.user_id === userId)
  }

  // Convert byte array to data URL
  const bytesToDataUrl = (bytes: number[], mimeType: string): string => {
    try {
      const base64 = btoa(String.fromCharCode(...bytes))
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('Error converting bytes to data URL:', error)
      return ''
    }
  }

  return (
    <Container size="large" className="py-8">
      <div className="mb-8">
        <Title level={1} className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-github-accent-primary" />
          Database Viewer
        </Title>
        <p className="text-github-text-secondary">
          Real-time view of Users and Avatars tables
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          onClick={loadData}
          disabled={isLoading}
          variant="primary"
          icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          iconPosition="left"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>


        <Button
          onClick={() => setShowPasswords(!showPasswords)}
          variant="outline"
          icon={showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          iconPosition="left"
        >
          {showPasswords ? 'Hide' : 'Show'} Passwords
        </Button>
      </div>

      {/* Last Refresh Info */}
      <div className="mb-6 p-3 bg-github-bg-secondary rounded-lg">
        <p className="text-sm text-github-text-secondary">
          Last refreshed: {formatDate(lastRefresh.toISOString())}
        </p>
      </div>

      {/* Users Table */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-github-accent-primary" />
            <h2 className="text-xl font-semibold">Users Table ({users.length} records)</h2>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-github-text-secondary" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-github-border-primary">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">Username</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Full Name</th>
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Active</th>
                  {showPasswords && (
                    <th className="text-left p-3 font-medium">Password Hash</th>
                  )}
                  <th className="text-left p-3 font-medium">Avatar</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={showPasswords ? 11 : 10} className="p-8 text-center text-github-text-secondary">
                      {isLoading ? 'Loading users...' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                  const avatar = getUserAvatar(user.id)
                  return (
                    <tr key={user.id} className="border-b border-github-border-secondary hover:bg-github-bg-hover">
                      <td className="p-3 font-mono text-sm">{user.id}</td>
                      <td className="p-3 font-medium">{user.username}</td>
                      <td className="p-3 text-github-text-secondary">{user.email}</td>
                      <td className="p-3">{user.full_name}</td>
                      <td className="p-3">{user.rank}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-github-accent-danger/20 text-github-accent-danger' 
                            : 'bg-github-accent-success/20 text-github-accent-success'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.is_active 
                            ? 'bg-github-accent-success/20 text-github-accent-success' 
                            : 'bg-github-accent-danger/20 text-github-accent-danger'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {showPasswords && (
                        <td className="p-3 font-mono text-xs text-github-text-tertiary">
                          {user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'N/A'}
                        </td>
                      )}
                      <td className="p-3">
                        {avatar ? (
                          <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-github-accent-success" />
                            <span className="text-xs text-github-text-secondary">
                              {formatFileSize(avatar.file_size)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-github-text-tertiary">No avatar</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-github-text-secondary">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-3 text-xs text-github-text-secondary">
                        {formatDate(user.updated_at)}
                      </td>
                    </tr>
                  )
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Avatars Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Image className="w-6 h-6 text-github-accent-primary" />
            <h2 className="text-xl font-semibold">Avatars Table ({avatars.length} records)</h2>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-github-text-secondary" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-github-border-primary">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">User ID</th>
                  <th className="text-left p-3 font-medium">Username</th>
                  <th className="text-left p-3 font-medium">MIME Type</th>
                  <th className="text-left p-3 font-medium">Size</th>
                  <th className="text-left p-3 font-medium">Data Preview</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {avatars.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-github-text-secondary">
                      {isLoading ? 'Loading avatars...' : 'No avatars found'}
                    </td>
                  </tr>
                ) : (
                  avatars.map((avatar) => {
                  const user = users.find(u => u.id === avatar.user_id)
                  return (
                    <tr key={avatar.id} className="border-b border-github-border-secondary hover:bg-github-bg-hover">
                      <td className="p-3 font-mono text-sm">{avatar.id}</td>
                      <td className="p-3 font-mono text-sm">{avatar.user_id}</td>
                      <td className="p-3 font-medium">
                        {user ? user.username : 'Unknown User'}
                      </td>
                      <td className="p-3 text-github-text-secondary">{avatar.mime_type}</td>
                      <td className="p-3 text-github-text-secondary">
                        {formatFileSize(avatar.file_size)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {avatar.avatar_data && avatar.avatar_data.length > 0 ? (
                            <img 
                              src={bytesToDataUrl(avatar.avatar_data, avatar.mime_type)}
                              alt="Avatar preview"
                              className="w-8 h-8 rounded border object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedAvatar(avatar)}
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-8 h-8 bg-github-bg-secondary rounded border flex items-center justify-center">
                                      <svg class="w-4 h-4 text-github-text-tertiary" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                      </svg>
                                    </div>
                                  `
                                }
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-github-bg-secondary rounded border flex items-center justify-center">
                              <Image className="w-4 h-4 text-github-text-tertiary" />
                            </div>
                          )}
                          <span className="text-xs text-github-text-tertiary">
                            {avatar.avatar_data ? `${avatar.avatar_data.length} bytes` : 'No data'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-github-text-secondary">
                        {formatDate(avatar.created_at)}
                      </td>
                      <td className="p-3 text-xs text-github-text-secondary">
                        {formatDate(avatar.updated_at)}
                      </td>
                    </tr>
                  )
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>


      {/* Avatar Preview Modal */}
      {selectedAvatar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedAvatar(null)}>
          <div className="bg-github-bg-primary rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Avatar Preview</h3>
              <button
                onClick={() => setSelectedAvatar(null)}
                className="text-github-text-secondary hover:text-github-text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <img 
                  src={bytesToDataUrl(selectedAvatar.avatar_data, selectedAvatar.mime_type)}
                  alt="Avatar preview"
                  className="max-w-full max-h-96 mx-auto rounded border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-32 h-32 bg-github-bg-secondary rounded border flex items-center justify-center mx-auto">
                          <svg class="w-16 h-16 text-github-text-tertiary" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      `
                    }
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-github-text-primary">User ID:</span>
                  <span className="ml-2 text-github-text-secondary">{selectedAvatar.user_id}</span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">Username:</span>
                  <span className="ml-2 text-github-text-secondary">
                    {users.find(u => u.id === selectedAvatar.user_id)?.username || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">MIME Type:</span>
                  <span className="ml-2 text-github-text-secondary">{selectedAvatar.mime_type}</span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">File Size:</span>
                  <span className="ml-2 text-github-text-secondary">{formatFileSize(selectedAvatar.file_size)}</span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">Data Size:</span>
                  <span className="ml-2 text-github-text-secondary">{selectedAvatar.avatar_data.length} bytes</span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">Created:</span>
                  <span className="ml-2 text-github-text-secondary">{formatDate(selectedAvatar.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export default DatabaseViewerPage
