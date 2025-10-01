import React, { useState, useRef, useEffect } from 'react';
import { Container, Title, Card, Button, Alert } from '../ui';
import Avatar from '../ui/Avatar';
import EditOfficerModal from '../ui/EditOfficerModal';
import { validateAvatarFile, fileToDataUrl, maybeDownscaleImage } from '../../services/avatarService';
import { invoke } from '@tauri-apps/api/tauri';
import navyLogo from '../../assets/images/navy_logo.webp';

interface HighRankingOfficer {
  id: number;
  thai_name: string;
  position_thai: string;
  position_english: string;
  order_index: number;
}

interface HybridHighRankAvatarInfo {
  avatar_path: string;
  file_exists: boolean;
}

const HighRanksPage: React.FC = () => {
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [officers, setOfficers] = useState<HighRankingOfficer[]>([]);
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<HighRankingOfficer | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Load officers and avatars from database
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load officers
        const officersData = await invoke<HighRankingOfficer[]>('get_all_high_ranking_officers');
        setOfficers(officersData);

        // Load avatars for each officer using Hybrid System
        const avatarPromises = officersData.map(async (officer) => {
          try {
            const avatarInfo = await invoke('get_hybrid_high_rank_avatar_info', {
              officerId: officer.id
            }) as HybridHighRankAvatarInfo;
            
            if (avatarInfo && avatarInfo.avatar_path && avatarInfo.file_exists) {
              // Get base64 data for display
              const base64Data = await invoke('get_hybrid_high_rank_avatar_base64', {
                avatarPath: avatarInfo.avatar_path
              }) as string;
              return { officerId: officer.id, url: base64Data };
            }
          } catch (error) {
            console.error(`Failed to load avatar for officer ${officer.id}:`, error);
          }
          return null;
        });

        const avatarResults = await Promise.all(avatarPromises);
        const avatarMap: Record<number, string> = {};
        
        avatarResults.forEach((result) => {
          if (result) {
            avatarMap[result.officerId] = result.url as string;
          }
        });
        
        setAvatars(avatarMap);
      } catch (error) {
        console.error('Failed to load officers:', error);
      }
    };

    loadData();

    // Cleanup function to revoke blob URLs
    return () => {
      Object.values(avatars).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Get image source for officer (database avatar or initial)
  const getOfficerImage = (officerId: number): string => {
    if (avatars[officerId]) {
      return avatars[officerId];
    }
    // No avatar: return empty string (use initial avatar UI)
    return '';
  };

  // Handle file selection for officer avatar
  const handleFileChange = async (officerId: number, file: File) => {
    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      setUploadError(validation.error || 'ไฟล์ไม่ถูกต้อง');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [officerId]: true }));
      setUploadError(null);

      // Delete old avatar before uploading new one
      await invoke('delete_hybrid_high_rank_avatar', { officerId });

      // Convert file to data URL
      let dataUrl = await fileToDataUrl(file);

      // Downscale image if needed
      try {
        const down = await maybeDownscaleImage(dataUrl, file.type);
        dataUrl = down.dataUrl;
      } catch (e) {
        // If downscale fails, continue with original
      }

      // Extract base64 data and MIME type from data URL
      const [header, base64Data] = dataUrl.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
        // Save avatar using Hybrid System
        await invoke('save_hybrid_high_rank_avatar', {
          officerId: officerId,
          avatarData: Array.from(bytes),
          mimeType: mimeType
        });

        // Success - refresh the avatar for this officer
        
        // Reload avatar for this specific officer using Hybrid System
        try {
          const avatarInfo = await invoke('get_hybrid_high_rank_avatar_info', {
            officerId: officerId
          }) as HybridHighRankAvatarInfo;
          
          if (avatarInfo && avatarInfo.avatar_path && avatarInfo.file_exists) {
            // Get base64 data for display
            const base64Data = await invoke('get_hybrid_high_rank_avatar_base64', {
              avatarPath: avatarInfo.avatar_path
            }) as string;
            
            // Update the avatar in state
            setAvatars(prev => ({
              ...prev,
              [officerId]: base64Data
            }));
          }
        } catch (error) {
          console.error('Failed to reload avatar:', error);
        }
      
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setUploadError('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploading(prev => ({ ...prev, [officerId]: false }));
    }
  };

  // Handle button click to trigger file input
  const handleChangeImageClick = (officerId: number) => {
    const fileInput = fileInputRefs.current[officerId];
    if (fileInput) {
      fileInput.click();
    }
  };

  // Handle edit button click
  const handleEditClick = (officer: HighRankingOfficer) => {
    setSelectedOfficer(officer);
    setEditModalOpen(true);
  };

  // Handle save officer
  const handleSaveOfficer = async (updatedOfficer: HighRankingOfficer) => {
    try {
      await invoke('update_high_ranking_officer', {
        id: updatedOfficer.id,
        thaiName: updatedOfficer.thai_name,
        positionThai: updatedOfficer.position_thai,
        positionEnglish: updatedOfficer.position_english,
        orderIndex: updatedOfficer.order_index
      });

      // Update the officers list
      setOfficers(prev => 
        prev.map(officer => 
          officer.id === updatedOfficer.id ? updatedOfficer : officer
        )
      );

    } catch (error) {
      console.error('Failed to update officer:', error);
      setUploadError('ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedOfficer(null);
  };

  return (
    <Container size="large" padding="large" className="py-12 sm:py-20">
      {/* Navy Logo Section */}
      <div className="flex justify-center mb-8">
        <img
          src={navyLogo}
          alt="กองทัพเรือไทย"
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-lg"
        />
      </div>

      <Title
        title="High Ranks Management"
        subtitle="จัดการข้อมูลผู้บังคับบัญชาระดับสูง"
        size="medium"
        align="center"
        className="mb-12"
      />

      {/* Officers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {officers.map((officer) => (
          <Card
            key={officer.id}
            title={officer.thai_name}
            subtitle={officer.position_thai}
            icon={
              <div className="flex justify-center mb-4">
                <Avatar
                  src={getOfficerImage(officer.id) || undefined}
                  name={officer.thai_name}
                  size="lg"
                  className="!w-20 !h-20 sm:!w-24 sm:!h-24 border-2 border-github-accent-warning"
                />
              </div>
            }
            hover={true}
            size="medium"
            className="max-w-sm mx-auto w-full text-center"
          >
            <div className="space-y-4">
              <p className="text-xs text-github-text-secondary">
                {officer.position_english}
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  size="small" 
                  className="flex-1"
                  onClick={() => handleEditClick(officer)}
                >
                  แก้ไขข้อมูล
                </Button>
                <Button 
                  variant="outline" 
                  size="small" 
                  className="flex-1"
                  onClick={() => handleChangeImageClick(officer.id)}
                  disabled={uploading[officer.id]}
                >
                  {uploading[officer.id] ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}
                </Button>
              </div>
              
              {/* Hidden File Input */}
              <input
                ref={(el) => (fileInputRefs.current[officer.id] = el)}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileChange(officer.id, file);
                  }
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="mt-8">
          <Alert
            type="error"
            title="เกิดข้อผิดพลาด"
            message={uploadError}
            showCloseButton={true}
            onClose={() => setUploadError(null)}
          />
        </div>
      )}

      {/* Info Alert */}
      <div className="mt-12 flex justify-center">
        <div className="w-auto max-w-4xl">
          <Alert
            type="info"
            title="ข้อมูลสำคัญ"
            message="หน้านี้ใช้สำหรับจัดการข้อมูลผู้บังคับบัญชาระดับสูงของกองทัพเรือ สามารถแก้ไขข้อมูลส่วนตัวและเปลี่ยนรูปภาพได้"
            showCloseButton={false}
          />
        </div>
      </div>

      {/* Edit Officer Modal */}
      <EditOfficerModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        officer={selectedOfficer}
        onSave={handleSaveOfficer}
      />
    </Container>
  );
};

export default HighRanksPage;
