import React, { useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

const AuthTestPage: React.FC = () => {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, message])
  }

  const testAuth = async () => {
    setIsLoading(true)
    setResults([])
    
    try {
      // Test 1: Check Tauri availability
      addResult('🔍 Testing Tauri availability...')
      if (typeof window !== 'undefined' && window.__TAURI__) {
        addResult('✅ Tauri is available')
      } else {
        addResult('❌ Tauri is NOT available - ต้องเปิดใน Desktop App เท่านั้น')
        return
      }

      // Test 2: Test database connection
      addResult('📊 Testing database connection...')
      const users = await invoke('debug_get_all_users')
      addResult(`✅ Database connected. Found ${users.length} users`)
      
      // Show user details
      if (users.length > 0) {
        users.forEach((user: any, index: number) => {
          addResult(`👤 User ${index + 1}: ${user.username} (${user.email}) - Role: ${user.role}`)
        })
      } else {
        addResult('⚠️ No users found in database')
      }

             // Test 3: Test authentication with username (lowercase)
             addResult('🔐 Testing authentication with username (lowercase)...')
             const authResult = await invoke('authenticate_user', {
               usernameOrEmail: 'thaweesak',
               passwordHash: 'Thaweesak&21'
             })
      
      if (authResult) {
        addResult(`✅ Authentication with username successful!`)
        addResult(`👤 User: ${authResult.username} (${authResult.full_name})`)
        addResult(`📧 Email: ${authResult.email}`)
        addResult(`🎖️ Rank: ${authResult.rank || 'N/A'}`)
        addResult(`🔑 Role: ${authResult.role}`)
        addResult(`✅ Active: ${authResult.is_active ? 'Yes' : 'No'}`)
      } else {
        addResult('❌ Authentication with username failed')
      }

             // Test 4: Test authentication with username (uppercase)
             addResult('🔐 Testing authentication with username (uppercase)...')
             const authResult2 = await invoke('authenticate_user', {
               usernameOrEmail: 'THAWEESAK',
               passwordHash: 'Thaweesak&21'
             })
             
             if (authResult2) {
               addResult(`✅ Authentication with uppercase username successful!`)
               addResult(`👤 User: ${authResult2.username} (${authResult2.full_name})`)
               addResult(`📧 Email: ${authResult2.email}`)
               addResult(`🎖️ Rank: ${authResult2.rank || 'N/A'}`)
               addResult(`🔑 Role: ${authResult2.role}`)
               addResult(`✅ Active: ${authResult2.is_active ? 'Yes' : 'No'}`)
             } else {
               addResult('❌ Authentication with uppercase username failed')
             }

             // Test 5: Test authentication with username (mixed case)
             addResult('🔐 Testing authentication with username (mixed case)...')
             const authResult3 = await invoke('authenticate_user', {
               usernameOrEmail: 'Thaweesak',
               passwordHash: 'Thaweesak&21'
             })
             
             if (authResult3) {
               addResult(`✅ Authentication with mixed case username successful!`)
               addResult(`👤 User: ${authResult3.username} (${authResult3.full_name})`)
               addResult(`📧 Email: ${authResult3.email}`)
               addResult(`🎖️ Rank: ${authResult3.rank || 'N/A'}`)
               addResult(`🔑 Role: ${authResult3.role}`)
               addResult(`✅ Active: ${authResult3.is_active ? 'Yes' : 'No'}`)
             } else {
               addResult('❌ Authentication with mixed case username failed')
             }

             // Test 6: Test authentication with email
             addResult('🔐 Testing authentication with email...')
             const authResult4 = await invoke('authenticate_user', {
               usernameOrEmail: 'davide@gmail.com',
               passwordHash: 'Thaweesak&21'
             })
      
             if (authResult4) {
               addResult(`✅ Authentication with email successful!`)
               addResult(`👤 User: ${authResult4.username} (${authResult4.full_name})`)
               addResult(`📧 Email: ${authResult4.email}`)
               addResult(`🎖️ Rank: ${authResult4.rank || 'N/A'}`)
               addResult(`🔑 Role: ${authResult4.role}`)
               addResult(`✅ Active: ${authResult4.is_active ? 'Yes' : 'No'}`)
             } else {
               addResult('❌ Authentication with email failed')
             }

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`)
      console.error('Test error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testSignIn = async () => {
    setIsLoading(true)
    setResults([])
    
    try {
      addResult('🔐 Testing Sign In with AuthContext...')
      
      // Test with username
      addResult('📝 Testing with username: thaweesak')
      const { authenticateUser } = await import('../../services/authService')
      
      const result = await authenticateUser('thaweesak', 'Thaweesak&21')
      
      if (result) {
        addResult('✅ Sign In with username successful!')
        addResult(`👤 User: ${result.username} (${result.full_name})`)
        addResult(`📧 Email: ${result.email}`)
        addResult(`🎖️ Rank: ${result.rank || 'N/A'}`)
        addResult(`🔑 Role: ${result.role}`)
        addResult(`✅ Active: ${result.is_active ? 'Yes' : 'No'}`)
      } else {
        addResult('❌ Sign In with username failed')
      }

      // Test with email
      addResult('📝 Testing with email: davide@gmail.com')
      const result2 = await authenticateUser('davide@gmail.com', 'Thaweesak&21')
      
      if (result2) {
        addResult('✅ Sign In with email successful!')
        addResult(`👤 User: ${result2.username} (${result2.full_name})`)
        addResult(`📧 Email: ${result2.email}`)
        addResult(`🎖️ Rank: ${result2.rank || 'N/A'}`)
        addResult(`🔑 Role: ${result2.role}`)
        addResult(`✅ Active: ${result2.is_active ? 'Yes' : 'No'}`)
      } else {
        addResult('❌ Sign In with email failed')
      }

    } catch (error: any) {
      addResult(`❌ Sign In Error: ${error.message}`)
      console.error('Sign In test error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      <p className="text-gray-600 mb-6">
        หน้านี้ใช้สำหรับทดสอบการเข้าสู่ระบบและตรวจสอบ database
      </p>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={testAuth}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Database & Auth'}
        </button>
        
        <button
          onClick={testSignIn}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Sign In Service'}
        </button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">กดปุ่มทดสอบเพื่อดูผลลัพธ์</p>
        ) : (
          results.map((result, index) => (
            <p key={index} className="mb-1 font-mono text-sm text-gray-900 dark:text-gray-100">{result}</p>
          ))
        )}
      </div>
    </div>
  )
}

export default AuthTestPage
