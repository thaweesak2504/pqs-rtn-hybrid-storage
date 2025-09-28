import React, { useState, useEffect } from 'react';
import { initDatabase, checkDatabaseHealth } from '../../services/database';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/userService';
import { getAvatarFromDatabase, saveAvatarToDatabase, removeAvatarFromDatabase } from '../../services/avatarDatabaseService';
import { useToast } from '../../contexts/ToastContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Title from '../ui/Title';

const SqliteTestPage = () => {
  const [dbStatus, setDbStatus] = useState<string>('Unknown');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Load users on component mount (database already initialized in App.tsx)
  useEffect(() => {
    loadUsers();
    setDbStatus('Connected'); // Database is already initialized in App.tsx
  }, []);

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      const result = await initDatabase();
      setDbStatus('Connected');
      showToast('Database re-initialized successfully', 'success');
      await loadUsers();
    } catch (error) {
      setDbStatus('Error');
      showToast(`Database initialization failed: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await getAllUsers();
      setUsers(userList);
    } catch (error) {
      showToast(`Failed to load users: ${error}`, 'error');
    }
  };

  const testCreateUser = async () => {
    try {
      setLoading(true);
      const newUser = await createUser(
        'Test User',
        `test${Date.now()}@example.com`,
        'password123',
        'user'
      );
      showToast('User created successfully', 'success');
      await loadUsers();
    } catch (error) {
      showToast(`Failed to create user: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseHealth = async () => {
    try {
      setLoading(true);
      const health = await checkDatabaseHealth();
      showToast(`Database health: ${health}`, 'success');
    } catch (error) {
      showToast(`Database health check failed: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testAvatarOperations = async () => {
    try {
      setLoading(true);
      
      // Create a test user first
      const testUser = await createUser(
        'Avatar Test User',
        `avatar${Date.now()}@example.com`,
        'password123',
        'user'
      );

      if (testUser && testUser.id) {
        // Create a simple test image (1x1 pixel PNG)
        const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        // Save avatar
        await saveAvatarToDatabase(testUser.id, testImageData);
        showToast('Avatar saved successfully', 'success');
        
        // Load avatar
        const avatar = await getAvatarFromDatabase(testUser.id);
        if (avatar) {
          showToast('Avatar loaded successfully', 'success');
        }
        
        // Remove avatar
        await removeAvatarFromDatabase(testUser.id);
        showToast('Avatar removed successfully', 'success');
        
        // Clean up test user
        await deleteUser(testUser.id);
        showToast('Test user cleaned up', 'info');
      }
      
      await loadUsers();
    } catch (error) {
      showToast(`Avatar operations failed: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Title level={1} className="mb-8">SQLite Database Test</Title>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Status */}
        <Card className="p-6">
          <Title level={2} className="mb-4">Database Status</Title>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                dbStatus === 'Connected' ? 'bg-green-100 text-green-800' :
                dbStatus === 'Error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {dbStatus}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Users Count:</span>
              <span className="text-lg font-bold">{users.length}</span>
            </div>
          </div>
        </Card>

        {/* Test Controls */}
        <Card className="p-6">
          <Title level={2} className="mb-4">Test Controls</Title>
          <div className="space-y-3">
            <Button
              onClick={initializeDatabase}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Loading...' : 'Initialize Database'}
            </Button>
            
            <Button
              onClick={testCreateUser}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Loading...' : 'Test Create User'}
            </Button>
            
            <Button
              onClick={testDatabaseHealth}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Loading...' : 'Test Database Health'}
            </Button>
            
            <Button
              onClick={testAvatarOperations}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Loading...' : 'Test Avatar Operations'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Users List */}
      <Card className="p-6 mt-6">
        <Title level={2} className="mb-4">Users in Database</Title>
        {users.length === 0 ? (
          <p className="text-gray-500">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">ID</th>
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">Role</th>
                  <th className="text-left py-2 px-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2 px-4">{user.id}</td>
                    <td className="py-2 px-4">{user.name}</td>
                    <td className="py-2 px-4">{user.email}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SqliteTestPage;
