import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import Container from '../ui/Container';
import Title from '../ui/Title';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useHybridAvatar } from '../../hooks/useHybridAvatar';

const HybridAvatarTestPage: React.FC = () => {
  const [usersCount, setUsersCount] = useState<number>(0);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Test with a dummy user ID (will be created for testing)
  const { 
    avatarInfo, 
    isLoading: avatarLoading, 
    saveAvatar, 
    deleteAvatar, 
    getAvatarBase64,
    exists 
  } = useHybridAvatar({ userId: 1, autoLoad: true });

  useEffect(() => {
    loadUsersCount();
  }, []);

  const loadUsersCount = async () => {
    try {
      const count = await invoke<number>('get_users_count');
      setUsersCount(count);
    } catch (error) {
      console.error('Failed to load users count:', error);
    }
  };

  const handleDeleteTestUsers = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('delete_test_users');
      setTestResult(result);
      await loadUsersCount();
    } catch (error) {
      setTestResult(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);
      
      const success = await saveAvatar(fileData, file.type);
      if (success) {
        setTestResult('Avatar saved successfully!');
        // Force refresh all avatar displays
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
          detail: { userId: 1, forceRefresh: true } 
        }));
        // Force page refresh to update all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setTestResult('Failed to save avatar');
      }
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const success = await deleteAvatar();
      if (success) {
        setTestResult('Avatar deleted successfully!');
        // Force refresh all avatar displays
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
          detail: { userId: 1, forceRefresh: true } 
        }));
        // Force page refresh to update all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setTestResult('Failed to delete avatar');
      }
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  const handleGetBase64 = async () => {
    try {
      const base64 = await getAvatarBase64();
      if (base64) {
        setTestResult(`Base64 length: ${base64.length} characters`);
        console.log('Base64 data:', base64.substring(0, 100) + '...');
      } else {
        setTestResult('No avatar found');
      }
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  return (
    <Container>
      <Title title="Hybrid Avatar System Test" />
      
      <div className="space-y-6">
        {/* Database Status */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Database Status</h3>
          <div className="space-y-2">
            <p>Total Users: <span className="font-mono">{usersCount}</span></p>
            <Button 
              onClick={handleDeleteTestUsers}
              variant="danger"
              size="small"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Test Users (Keep Admin)'}
            </Button>
          </div>
        </Card>

        {/* Avatar Test */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Avatar Test (User ID: 1)</h3>
          <div className="space-y-4">
            <div>
              <p>Avatar Status: {exists ? '✅ Exists' : '❌ No Avatar'}</p>
              <p>Loading: {avatarLoading ? '⏳ Loading...' : '✅ Ready'}</p>
              {avatarInfo && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                  <p>Path: {avatarInfo.avatar_path || 'None'}</p>
                  <p>MIME: {avatarInfo.avatar_mime || 'None'}</p>
                  <p>Size: {avatarInfo.avatar_size || 0} bytes</p>
                  <p>File Exists: {avatarInfo.file_exists ? '✅' : '❌'}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleDeleteAvatar}
                  variant="danger"
                  size="small"
                  disabled={!exists}
                >
                  Delete Avatar
                </Button>
                
                <Button 
                  onClick={handleGetBase64}
                  variant="secondary"
                  size="small"
                  disabled={!exists}
                >
                  Get Base64
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Test Results */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Test Results</h3>
          <div className="p-4 bg-gray-100 rounded">
            <pre className="text-sm whitespace-pre-wrap">{testResult || 'No results yet...'}</pre>
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Test Instructions</h3>
          <div className="space-y-2 text-sm">
            <p>1. <strong>Clean Database:</strong> Click "Delete Test Users" to remove all users except admin</p>
            <p>2. <strong>Test Avatar Upload:</strong> Select an image file to test hybrid avatar system</p>
            <p>3. <strong>Test Avatar Display:</strong> Check if avatar shows correctly</p>
            <p>4. <strong>Test Avatar Operations:</strong> Try delete and base64 conversion</p>
            <p>5. <strong>Check File System:</strong> Verify files are saved in media/avatars/ folder</p>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default HybridAvatarTestPage;
