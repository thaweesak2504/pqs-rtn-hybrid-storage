import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { Container, Card, Button, Title } from '../ui'
import { RefreshCw, Database, Users, Image, Eye, EyeOff, X, CheckCircle, XCircle } from 'lucide-react'

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
  avatar_path?: string
  avatar_updated_at?: string
  avatar_mime?: string
  avatar_size?: number
}

interface Avatar {
  user_id: number
  avatar_path: string | null
  avatar_updated_at: string | null
  avatar_mime: string | null
  avatar_size: number | null
  file_exists: boolean
}

const DatabaseViewerPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [avatarImages, setAvatarImages] = useState<Record<number, string>>({})
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

      // Load avatars from users table (file-based storage)
      const avatarsData: Avatar[] = []
      const images: Record<number, string> = {}
      
      for (const user of usersData) {
        if (user.avatar_path) {
          avatarsData.push({
            user_id: user.id!,
            avatar_path: user.avatar_path,
            avatar_updated_at: user.avatar_updated_at || null,
            avatar_mime: user.avatar_mime || null,
            avatar_size: user.avatar_size || null,
            file_exists: true // Assume file exists if path is present
          })
          
          // Load avatar image
          try {
            const base64Data = await invoke('get_hybrid_avatar_base64', { 
              avatarPath: user.avatar_path 
            }) as string
            images[user.id!] = base64Data
          } catch (error) {
            console.error(`Failed to load avatar for user ${user.id}:`, error)
          }
        }
      }
      setAvatars(avatarsData)
      setAvatarImages(images)

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

  // Get user by ID
  const getUserById = (userId: number) => {
    return users.find(user => user.id === userId)
  }



  return (
    <Container size="large" className="py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-github-accent-primary" />
          <Title title="Database Viewer" className="mb-0" />
        </div>
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
                              {avatar.avatar_size ? formatFileSize(avatar.avatar_size) : 'Unknown size'}
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
                  <th className="text-left p-3 font-medium">User ID</th>
                  <th className="text-left p-3 font-medium">Username</th>
                  <th className="text-left p-3 font-medium">File Path</th>
                  <th className="text-left p-3 font-medium">MIME Type</th>
                  <th className="text-left p-3 font-medium">Size</th>
                  <th className="text-left p-3 font-medium">File Exists</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                  <th className="text-left p-3 font-medium">Preview</th>
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
                  const user = getUserById(avatar.user_id)
                  return (
                    <tr key={avatar.user_id} className="border-b border-github-border-secondary hover:bg-github-bg-hover">
                      <td className="p-3 font-mono text-sm">{avatar.user_id}</td>
                      <td className="p-3 font-medium">
                        {user ? user.username : 'Unknown User'}
                      </td>
                      <td className="p-3 font-mono text-sm text-github-text-secondary">
                        {avatar.avatar_path || 'No path'}
                      </td>
                      <td className="p-3 text-github-text-secondary">{avatar.avatar_mime || 'Unknown'}</td>
                      <td className="p-3 text-github-text-secondary">
                        {avatar.avatar_size ? formatFileSize(avatar.avatar_size) : 'Unknown'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          {avatar.file_exists ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-github-text-secondary">
                        {avatar.avatar_updated_at ? formatDate(avatar.avatar_updated_at) : 'Never'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {avatar.avatar_path && avatar.file_exists && avatarImages[avatar.user_id] ? (
                            <img 
                              src={avatarImages[avatar.user_id]}
                              alt="Avatar preview"
                              className="w-8 h-8 rounded-full object-cover object-top border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedAvatar(avatar)}
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-8 h-8 bg-github-bg-secondary rounded-full flex items-center justify-center">
                                      <span class="text-xs text-github-text-secondary">📁</span>
                                    </div>
                                  `
                                }
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-github-bg-secondary rounded-full flex items-center justify-center">
                              <Image className="w-4 h-4 text-github-text-tertiary" />
                            </div>
                          )}
                        </div>
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
          <div className="max-w-md max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <Card 
              variant="elevated" 
              size="medium"
              className="relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedAvatar(null)}
                className="absolute top-4 right-4 text-github-text-secondary hover:text-github-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Avatar Image */}
              <div className="text-center mb-4">
                <img 
                  src={avatarImages[selectedAvatar.user_id] || ''}
                  alt="Avatar preview"
                  className="max-w-full max-h-80 mx-auto rounded-lg border border-github-border-primary"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-32 h-32 bg-github-bg-secondary rounded-lg border border-github-border-primary flex items-center justify-center mx-auto">
                          <svg class="w-16 h-16 text-github-text-tertiary" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      `
                    }
                  }}
                />
              </div>
              
              {/* Avatar Info */}
              <div className="text-center space-y-2">
                <div>
                  <span className="font-medium text-github-text-primary">Username:</span>
                  <span className="ml-2 text-github-text-secondary">
                    {users.find(u => u.id === selectedAvatar.user_id)?.username || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-github-text-primary">File Size:</span>
                  <span className="ml-2 text-github-text-secondary">
                    {selectedAvatar.avatar_size ? formatFileSize(selectedAvatar.avatar_size) : 'Unknown'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </Container>
  )
}

export default DatabaseViewerPage
