import React, { useState, useEffect, useRef } from 'react'
import { Edit, Trash2, Save, X, User, Mail, Star, Eye, EyeOff, Key } from 'lucide-react'
import { Button, Card, CustomSelect } from './ui'
import type { User as UserType } from '../types/user'
import { createUser, getAllUsers, updateUser, deleteUser } from '../services/userService'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import { validateAvatarFile, fileToDataUrl, maybeDownscaleImage } from '../services/avatarService'
import UserAvatar from './UserAvatar'


const UserCRUDForm: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const { checkAuthStatus, user: currentUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    rank: '',
    role: 'visitor' as 'admin' | 'editor' | 'visitor'
  })
  
  // Password visibility toggle for form
  const [showFormPassword, setShowFormPassword] = useState(false)
  // Avatar preview (base64) map for admin viewing in dev http origin and immediate feedback post upload
  const [avatarPreviews, setAvatarPreviews] = useState<Record<number, string>>({})
  // Track per-user avatar loading state (upload/remove in progress)
  const [avatarBusy, setAvatarBusy] = useState<Record<number, boolean>>({})
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Note: UserAvatar components listen to avatarUpdated events and refresh themselves
  // No need to handle events here - just dispatch them when we make changes

  // Load users from database
  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const userList = await getAllUsers()
      // Cast TauriUser[] to User[] with proper typing
      setUsers(userList.map(u => ({
        ...u,
        role: u.role as 'admin' | 'editor' | 'visitor',
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at || new Date().toISOString()
      })))
      // In dev (http origin) file:// cannot be loaded; hydrate previews by reading avatars via IPC if available
      try {
        const origin = window.location.origin
        const canRead = (window as any).api?.avatar?.read
        if (!origin.startsWith('file://') && canRead) {
          for (const u of userList) {
            if (u.id && u.avatar_path) {
              try {
                const res = await (window as any).api.avatar.read(u.id)
                if (res?.ok && res.dataUrl) {
                  setAvatarPreviews(prev => ({ ...prev, [u.id as number]: res.dataUrl }))
                }
              } catch (error) {
                console.warn('Error:', error);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error:', error);
      }
      
      // Password loading removed for security
    } catch (error) {
      console.error('Failed to load users:', error)
      showError('Load failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle avatar file selection for a user
  const handleAvatarFileChange = async (user: UserType, file: File) => {
    if (!user.id) return
    const { ok, error } = validateAvatarFile(file)
    if (!ok) { showError(error || 'ไฟล์ไม่ถูกต้อง'); return }
    try {
      setAvatarBusy(prev => ({ ...prev, [user.id as number]: true }))
      let dataUrl = await fileToDataUrl(file)
      try {
        const down = await maybeDownscaleImage(dataUrl, file.type)
        dataUrl = down.dataUrl
      } catch (e) {
        // If downscale fails for any reason, continue with original if within limits
      }
      // Save using Hybrid Avatar System
      try {
        // Convert data URL to Uint8Array
        const response = await fetch(dataUrl)
        const arrayBuffer = await response.arrayBuffer()
        const fileData = new Uint8Array(arrayBuffer)
        
        // Get MIME type from data URL
        const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg'
        
        // Save avatar using Hybrid Avatar System
        const { invoke } = await import('@tauri-apps/api/tauri')
        const result = await invoke('save_hybrid_avatar', {
          userId: user.id,
          avatarData: Array.from(fileData),
          mimeType: mimeType
        }) as { avatar_updated_at: string; avatar_mime: string; avatar_size: number; avatar_path: string }
        
        // Update local users state with hybrid avatar info
        setUsers(prev => prev.map(u => u.id === user.id ? { 
          ...u, 
          avatar_updated_at: result.avatar_updated_at, 
          avatar_mime: result.avatar_mime, 
          avatar_size: result.avatar_size,
          avatar_path: result.avatar_path
        } : u))
        
        // Clear preview since avatar is saved
        setAvatarPreviews(prev => { const { [user.id as number]: _omit, ...rest } = prev; return rest })
        
        // Trigger global avatar refresh event for all components
        // UserAvatar hook will handle the refresh automatically
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
          detail: { userId: user.id, avatarPath: result.avatar_path, forceRefresh: true } 
        }))
        
        showSuccess('อัปเดต Avatar สำเร็จ (Hybrid System)')
      } catch (dbError) {
        console.error('Database save failed:', dbError)
        showError('บันทึกรูปไม่สำเร็จ')
      }
    } catch (e) {
      console.error('Avatar upload failed', e)
      showError('อัปโหลดล้มเหลว')
    } finally {
      setAvatarBusy(prev => ({ ...prev, [user.id as number]: false }))
      // Reset input value to allow same file reselect
      try { if (fileInputRefs.current[user.id]) fileInputRefs.current[user.id]!.value = '' } catch (error) {
          console.warn('Error:', error);
        }
    }
  }

  const triggerAvatarSelect = (user: UserType) => {
    if (!user.id) return
    const ref = fileInputRefs.current[user.id]
    if (ref) ref.click()
  }

  const handleRemoveAvatar = async (user: UserType) => {
    if (!user.id) {
      console.error('Cannot delete avatar: user.id is undefined')
      showError('ข้อมูลผู้ใช้ไม่ถูกต้อง')
      return
    }
    
    // No confirmation dialog needed - user can easily re-upload if mistake
    
    try {
      setAvatarBusy(prev => ({ ...prev, [user.id as number]: true }))
      
      // Delete avatar using Hybrid Avatar System with enhanced error handling
      try {
        const { invoke } = await import('@tauri-apps/api/tauri')
        
        // Call Tauri backend with proper error handling
        const result = await invoke<boolean>('delete_hybrid_avatar', { 
          userId: user.id 
        })
        
        if (!result) {
          throw new Error('Backend returned false - delete operation failed')
        }
        
        console.log('Avatar deleted successfully for user:', user.id)
        
      } catch (dbError: any) {
        console.error('Hybrid avatar delete failed:', {
          error: dbError,
          userId: user.id,
          message: dbError?.message || String(dbError)
        })
        
        // Show user-friendly error message
        const errorMessage = typeof dbError === 'string' 
          ? dbError 
          : dbError?.message || 'ลบรูปไม่สำเร็จ - กรุณาลองอีกครั้ง'
        
        showError(errorMessage)
        return
      }
      
      // Update local users state with hybrid avatar info
      setUsers(prev => prev.map(u => u.id === user.id ? { 
        ...u, 
        avatar_updated_at: null, 
        avatar_mime: null, 
        avatar_size: null,
        avatar_path: null
      } : u))
      
      // Clear avatar preview safely
      setAvatarPreviews(prev => { 
        const { [user.id as number]: _omit, ...rest } = prev
        return rest
      })
        
      // Trigger global avatar refresh event (single dispatch only)
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatarUpdated', {
          detail: { userId: user.id, forceRefresh: true }
        }))
      }, 50)
        
      showSuccess('ลบ Avatar สำเร็จ')
      
    } catch (e: any) {
      console.error('Remove avatar failed - outer catch:', {
        error: e,
        stack: e?.stack,
        userId: user.id
      })
      showError(`ลบล้มเหลว: ${e?.message || String(e)}`)
    } finally {
      // Always clear busy state
      setAvatarBusy(prev => ({ ...prev, [user.id as number]: false }))
    }
  }

  // Password loading functions removed for security

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle CustomSelect change (has different signature)
  const handleSelectChange = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.username.trim()) {
      showError('Required fields missing')
      return
    }

    try {
      setIsLoading(true)
      
      if (editingUser) {
        // Update existing user
        const updatedUser = await updateUser(editingUser.id!, formData)
        if (updatedUser) {
          showSuccess('User updated')
          setEditingUser(null)
        } else {
          showError('User not found')
        }
      } else {
        // Create new user
        if (!formData.password.trim()) {
          showError('กรุณากรอกรหัสผ่าน')
          return
        }
        
        await createUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          rank: formData.rank || undefined,
          role: formData.role
        })
        showSuccess('User created')
      }
      
      // Reset form and reload users
      setFormData({ full_name: '', email: '', username: '', password: '', rank: '', role: 'visitor' })
      setShowFormPassword(false)
      loadUsers()
    } catch (error) {
      console.error('Failed to save user:', error)
      showError('Save failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle edit user
  const handleEditUser = (user: UserType) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      password: '', // Don't show existing password
      rank: user.rank || '',
      role: user.role || 'visitor'
    })
  }

  // Handle delete user
  const handleDeleteUser = async (id: number) => {
    // Find the user to be deleted
    const userToDelete = users.find(u => u.id === id)
    
    // Prevent admin from deleting themselves
  if (userToDelete && currentUser && String(userToDelete.id) === String(currentUser.id)) {
      showError('ไม่สามารถลบบัญชีของตัวเองได้')
      return
    }
    
    // Prevent deleting admin users
    if (userToDelete && userToDelete.role === 'admin') {
      showError('ไม่สามารถลบผู้ดูแลระบบได้')
      return
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      setIsLoading(true)
      const success = await deleteUser(id)
      if (success) {
        showSuccess('User deleted')
        loadUsers()
        // Refresh auth state to prevent Sign In Form issues
        await checkAuthStatus()
      } else {
        showError('User not found')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      showError('Delete failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingUser(null)
    setFormData({ full_name: '', email: '', username: '', password: '', rank: '', role: 'visitor' })
    setShowFormPassword(false)
  }

  // Handle cancel create (clear form)
  const handleCancelCreate = () => {
    setFormData({ full_name: '', email: '', username: '', password: '', rank: '', role: 'visitor' })
    setShowFormPassword(false)
  }

  // Check if form has any input
  const hasFormInput = formData.full_name || formData.email || formData.username || formData.password || formData.rank || formData.role !== 'visitor'

  // Password management functions removed for security


  return (
    <div className="space-y-6">
      {/* Form */}
      <Card title="User Management" subtitle="Create and manage users">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-github-text-primary mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-primary placeholder-github-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-github-text-primary mb-1">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-primary placeholder-github-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  placeholder="Enter username"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-github-text-primary mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-primary placeholder-github-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-github-text-primary mb-1">
                Password *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
                <input
                  type={showFormPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-9 pr-12 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-primary placeholder-github-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-github-text-tertiary hover:text-github-text-secondary transition-colors"
                >
                  {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Rank */}
            <CustomSelect
              name="rank"
              value={formData.rank}
              onChange={handleSelectChange}
              label="Rank"
              placeholder="เลือกยศ"
              icon={Star}
              options={[
                { value: 'จ.ต.', label: 'จ.ต.' },
                { value: 'จ.ท.', label: 'จ.ท.' },
                { value: 'จ.อ.', label: 'จ.อ.' },
                { value: 'พ.จ.ต.', label: 'พ.จ.ต.' },
                { value: 'พ.จ.ท.', label: 'พ.จ.ท.' },
                { value: 'พ.จ.อ.', label: 'พ.จ.อ.' },
                { value: 'ร.ต.', label: 'ร.ต.' },
                { value: 'ร.ท.', label: 'ร.ท.' },
                { value: 'ร.อ.', label: 'ร.อ.' },
                { value: 'น.ต.', label: 'น.ต.' },
                { value: 'น.ท.', label: 'น.ท.' },
                { value: 'น.อ.', label: 'น.อ.' },
                { value: 'อื่นๆ', label: 'อื่นๆ' }
              ]}
            />

            {/* Role */}
            <CustomSelect
              name="role"
              value={formData.role}
              onChange={handleSelectChange}
              label="Role"
              icon={Star}
              options={[
                { value: 'visitor', label: 'Visitor' },
                { value: 'editor', label: 'Editor' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              icon={<Save className="w-4 h-4" />}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
            
            {(editingUser || hasFormInput) && (
              <Button
                type="button"
                variant="outline"
                onClick={editingUser ? handleCancelEdit : handleCancelCreate}
                icon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Password Security section removed for security */}

      {/* Users List */}
      <Card title={`Users (${users.length})`} subtitle="Manage existing users">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-accent-primary mx-auto"></div>
            <p className="text-sm text-github-text-secondary mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-github-text-tertiary mx-auto mb-4" />
            <p className="text-github-text-secondary">No users found</p>
            <p className="text-sm text-github-text-tertiary">Create your first user above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-github-border-primary rounded-lg bg-github-bg-secondary hover:bg-github-bg-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="relative flex flex-col items-center">
                      <UserAvatar 
                        user={user} 
                        size="md" 
                        className={avatarBusy[user.id as number] ? 'opacity-60' : ''} 
                      />
                      {currentUser?.role === 'admin' && user.id && (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            disabled={!!avatarBusy[user.id as number]}
                            onClick={() => triggerAvatarSelect(user)}
                            className="px-1 py-0.5 text-[10px] rounded bg-github-accent-primary text-white hover:bg-github-accent-primary-hover disabled:opacity-50"
                          >
                            {avatarBusy[user.id as number] ? '...' : 'เปลี่ยน'}
                          </button>
                          { (user.avatar_path || avatarPreviews[user.id as number]) && (
                            <button
                              type="button"
                              disabled={!!avatarBusy[user.id as number]}
                              onClick={() => handleRemoveAvatar(user)}
                              className="px-1 py-0.5 text-[10px] rounded border border-github-border-primary hover:bg-github-bg-hover disabled:opacity-50"
                            >ลบ</button>
                          )}
                          <input
                            ref={el => { if (user.id) fileInputRefs.current[user.id] = el }}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) handleAvatarFileChange(user, f)
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-github-text-primary">
                        {user.rank ? `${user.rank} ${user.full_name}` : user.full_name}
                      </h3>
                      <p className="text-sm text-github-text-secondary">{user.email}</p>
                      <div className="flex items-center gap-4 text-xs text-github-text-tertiary">
                        <span>Username: {user.username}</span>
                        <span>Role: {user.role}</span>
                        
                        {/* Password section removed for security */}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleEditUser(user)}
                    icon={<Edit className="w-4 h-4" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleDeleteUser(user.id!)}
                    icon={<Trash2 className="w-4 h-4" />}
                    disabled={
                      user.role === 'admin' || (currentUser ? String(user.id) === String(currentUser.id) : false)
                    }
                    className={
                      // Add visual indication for disabled state
                      (user.role === 'admin' || (currentUser ? String(user.id) === String(currentUser.id) : false))
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default UserCRUDForm
