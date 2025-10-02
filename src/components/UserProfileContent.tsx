import React from 'react'
import { User, Settings, LogOut, Mail, Shield, Edit } from 'lucide-react'
import Avatar from './ui/Avatar'
import { validateAvatarFile, fileToDataUrl, maybeDownscaleImage } from '../services/avatarService'
import { useAuth } from '../hooks/useAuth'
import { useHybridAvatar } from '../hooks/useHybridAvatar'
import { Button } from './ui'
import { useNavigate } from 'react-router-dom'

const UserProfileContent: React.FC = () => {
  const { signOut, user, updateAvatar } = useAuth()
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const navigate = useNavigate()
  
  // Get avatar from hybrid system
  const { avatar: hybridAvatar, saveAvatar, refreshAvatar } = useHybridAvatar({
    userId: user?.id ? parseInt(user.id, 10) : 0,
    autoLoad: !!user?.id
  })

  const handleSignOut = () => {
    signOut()
    navigate('/home') // Navigate to Welcome/Home after sign out
  }

  const handleEditProfile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const validation = validateAvatarFile(file)
    if (!validation.ok) {
      setUploadError(validation.error || 'ไฟล์ไม่ถูกต้อง')
      return
    }
    setIsUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const { dataUrl: processed } = await maybeDownscaleImage(dataUrl, file.type)
      setPreview(processed)
    } catch {
      setUploadError('ไม่สามารถประมวลผลหรือย่อรูปได้')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveAvatar = async () => {
    if (!preview) return
    if (!user?.id) {
      setUploadError('ไม่พบข้อมูลผู้ใช้')
      return
    }
    
    // Convert data URL to file for hybrid avatar system
    try {
      const response = await fetch(preview)
      const arrayBuffer = await response.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)
      
      // Get MIME type from data URL
      const mimeType = preview.split(';')[0].split(':')[1] || 'image/jpeg'
      
      // Save using hybrid avatar system
      const success = await saveAvatar(fileData, mimeType)
      if (success) {
        setPreview(null)
        // No need to refresh or dispatch event - saveAvatar already updates the state
      } else {
        setUploadError('ไม่สามารถบันทึกรูปได้')
      }
    } catch (error) {
      console.error('Failed to convert data URL to file:', error)
      setUploadError('ไม่สามารถแปลงรูปได้')
    }
  }

  const handleCancelPreview = () => {
    setPreview(null)
  }

  const handleRemoveAvatar = async () => {
    if (!user?.id) return

    try {
      // Delete avatar using Hybrid Avatar System
      const { invoke } = await import('@tauri-apps/api/tauri')
      await invoke('delete_hybrid_avatar', { userId: parseInt(user.id, 10) })

      // Update local state
      await updateAvatar(null)
      setPreview(null)

      // No need to dispatch event - deleteAvatar in hook already updates state

    } catch (error) {
      console.error('Failed to remove avatar:', error)
    }
  }

  // Listen for global avatar update events
  React.useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId } = event.detail
      if (Number(userId) === Number(user?.id)) {
        refreshAvatar()
      }
    }
    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }
  }, [user?.id, refreshAvatar])

  // Paste support
  React.useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (!file) return
      const validation = validateAvatarFile(file)
      if (!validation.ok) { setUploadError(validation.error || 'ไฟล์ไม่ถูกต้อง'); return }
      setIsUploading(true); setUploadError(null)
      try {
        const dataUrl = await fileToDataUrl(file)
        const { dataUrl: processed } = await maybeDownscaleImage(dataUrl, file.type)
        setPreview(processed)
      } catch { setUploadError('ไม่สามารถประมวลผลรูปจาก Clipboard') }
      finally { setIsUploading(false) }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  const [isDragging, setIsDragging] = React.useState(false)
  const dragDepth = React.useRef(0)

  // Dev-time loader: if we only have a filesystem path (and base64 missing) convert it to dataUrl via IPC for http:// origin
  React.useEffect(() => {
    const run = async () => {
      if (!user?.id) return
      if (preview) return
      if (user?.avatar) return
      const pathOnly = (user as any)?.avatar_path
      if (!pathOnly) return
      const api = (window as any)?.api
      if (!api?.avatar?.read) return
      const origin = window.location.origin
      if (origin.startsWith('file://')) return
      try {
        const res = await api.avatar.read(user.id)
        if (res?.ok && res.dataUrl) {
          await updateAvatar(res.dataUrl)
        }
      } catch (error) {
          console.warn('Error:', error);
        }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user as any)?.avatar_path])


  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragDepth.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      setIsDragging(false)
      dragDepth.current = 0
    }
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false); dragDepth.current = 0
    if (e.dataTransfer.files?.length) {
      const f = e.dataTransfer.files[0]
      const validation = validateAvatarFile(f)
      if (!validation.ok) { setUploadError(validation.error || 'ไฟล์ไม่ถูกต้อง'); return }
      setIsUploading(true); setUploadError(null)
      try {
        const dataUrl = await fileToDataUrl(f)
        const { dataUrl: processed } = await maybeDownscaleImage(dataUrl, f.type)
        setPreview(processed)
      } catch { setUploadError('ไม่สามารถประมวลผลไฟล์ (drag-drop)') }
      finally { setIsUploading(false) }
    }
  }


  return (
    <div
      className="space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] border-2 border-dashed border-github-accent-primary flex items-center justify-center z-20 pointer-events-none animate-fade-in">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-github-text-primary">ปล่อยไฟล์เพื่ออัปโหลด Avatar</p>
            <p className="text-[10px] text-github-text-tertiary">รองรับ .png .jpg .webp ≤ 300KB</p>
          </div>
        </div>
      )}
      {/* Avatar & Basic Info */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Avatar
            src={preview || hybridAvatar || undefined}
            version={preview ? null : (user as any)?.avatar_updated_at || null}
            name={user?.name}
            size="lg"
            className={`border-2 ${preview ? 'ring-2 ring-github-accent-primary' : ''}`}
            onImageError={() => {
              // Could trigger a silent re-migration or path cleanup in future
            }}
          />
          <button
            onClick={handleEditProfile}
            className="absolute -bottom-1 -right-1 p-1.5 bg-github-accent-primary text-white rounded-full hover:bg-github-accent-primary-hover transition-colors"
            aria-label="Edit profile"
          >
            <Edit className="w-3 h-3" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-github-text-primary">
            {user?.username || 'น.อ.ทวีศักดิ์ ทองนาค'}
          </h4>
          <p className="text-sm text-github-text-secondary">
            {user?.role || 'นายทหารแผนงานไฟฟ้าอาวุธฯ'}
          </p>
          <div className="flex items-center mt-2">
            <div className="w-2 h-2 bg-github-accent-success rounded-full mr-2"></div>
            <span className="text-xs text-github-text-secondary">Online</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-[10px] text-center text-github-text-tertiary mt-2">
        Drag & Drop หรือกดปุ่มดินสอ เพื่อเปลี่ยน Avatar
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="p-3 border border-github-border-primary rounded-lg bg-github-bg-secondary space-y-2">
            <p className="text-sm text-github-text-primary font-medium mb-2">ตัวอย่างรูปใหม่</p>
            <div className="flex items-center space-x-4">
              <Avatar src={preview} name={user?.name} size="sm" />
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSaveAvatar}
                  disabled={isUploading}
                >
                  บันทึก
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={handleCancelPreview}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
            {isUploading && <p className="text-xs text-github-text-secondary mt-2">กำลังประมวลผล...</p>}
            <p className="text-[10px] text-github-text-tertiary">กรุณาเลือกรูปขนาด ≤300KB</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="p-3 border border-github-border-primary rounded-lg bg-github-bg-danger/10">
          <p className="text-xs text-github-accent-warning">{uploadError}</p>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-github-text-primary uppercase tracking-wide">
          ข้อมูลติดต่อ
        </h5>
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-sm text-github-text-secondary">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{user?.email || 'twaisak.thongnak@rtn.mi.th'}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-github-text-secondary">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Security Level: Top Secret</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-github-text-primary uppercase tracking-wide">
          การดำเนินการ
        </h5>
        <div className="space-y-2">
          <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-github-bg-hover transition-colors text-left">
            <User className="w-5 h-5 text-github-text-secondary" />
            <span className="text-sm font-medium text-github-text-primary">ดูโปรไฟล์</span>
          </button>
          
          <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-github-bg-hover transition-colors text-left">
            <Settings className="w-5 h-5 text-github-text-secondary" />
            <span className="text-sm font-medium text-github-text-primary">ตั้งค่า</span>
          </button>
          <button
            onClick={handleRemoveAvatar}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-github-bg-hover transition-colors text-left"
          >
            <Shield className="w-5 h-5 text-github-text-secondary" />
            <span className="text-sm font-medium text-github-text-primary">ลบ Avatar</span>
          </button>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-4 border-t border-github-border-primary">
        <Button
          variant="outline"
          size="medium"
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleSignOut}
          className="w-full justify-center"
        >
          ออกจากระบบ
        </Button>
      </div>

    </div>
  )
}

export default UserProfileContent
