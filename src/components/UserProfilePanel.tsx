import React from 'react'
import { RightPanel } from './ui'
import UserProfileContent from './UserProfileContent'

interface UserProfilePanelProps {
  isOpen: boolean
  onClose: () => void
}

const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ isOpen, onClose }) => {
  return (
    <RightPanel
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      position="right"
      width="w-64"
      height="h-[calc(100vh-4rem)]"
      showBackdrop={false}
    >
      <UserProfileContent />
    </RightPanel>
  )
}

export default UserProfilePanel
