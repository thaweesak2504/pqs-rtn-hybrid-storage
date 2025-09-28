import React, { useState, useEffect } from 'react'
import { RefreshCw, Trash2, AlertTriangle, Users, Image, Database, Filter } from 'lucide-react'
import Container from '../ui/Container'
import { Button } from '../ui'
import DatabaseLogService, { DatabaseLogEntry } from '../../services/databaseLogService'

const DatabaseLogPage: React.FC = () => {
  const [logs, setLogs] = useState<DatabaseLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<DatabaseLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    operation: '',
    tableName: '',
    userId: '',
    showDangerousOnly: false
  })

  const loadLogs = async () => {
    setLoading(true)
    try {
      const logString = await DatabaseLogService.getLogs()
      const parsedLogs = DatabaseLogService.parseLogs(logString)
      setLogs(parsedLogs)
      setFilteredLogs(parsedLogs)
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all database logs?')) {
      try {
        await DatabaseLogService.clearLogs()
        setLogs([])
        setFilteredLogs([])
      } catch (error) {
        console.error('Failed to clear logs:', error)
      }
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    if (filter.operation) {
      filtered = filtered.filter(log => 
        log.operation.toLowerCase().includes(filter.operation.toLowerCase())
      )
    }

    if (filter.tableName) {
      filtered = filtered.filter(log => 
        log.tableName.toLowerCase().includes(filter.tableName.toLowerCase())
      )
    }

    if (filter.userId) {
      const userId = parseInt(filter.userId)
      if (!isNaN(userId)) {
        filtered = filtered.filter(log => log.userId === userId)
      }
    }

    if (filter.showDangerousOnly) {
      const dangerousOps = ['CreateTable', 'DropTable', 'TruncateTable', 'ResetDatabase']
      filtered = filtered.filter(log => 
        dangerousOps.some(op => log.operation.includes(op))
      )
    }

    setFilteredLogs(filtered)
  }

  useEffect(() => {
    loadLogs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, filter])

  const getOperationColor = (operation: string) => {
    if (operation.includes('CreateTable') || operation.includes('DropTable') || 
        operation.includes('TruncateTable') || operation.includes('ResetDatabase')) {
      return 'text-red-600 bg-red-50 border-red-200'
    }
    if (operation.includes('Delete')) {
      return 'text-orange-600 bg-orange-50 border-orange-200'
    }
    if (operation.includes('Update')) {
      return 'text-blue-600 bg-blue-50 border-blue-200'
    }
    if (operation.includes('Insert')) {
      return 'text-green-600 bg-green-50 border-green-200'
    }
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getOperationIcon = (operation: string) => {
    if (operation.includes('CreateTable') || operation.includes('DropTable') || 
        operation.includes('TruncateTable') || operation.includes('ResetDatabase')) {
      return <AlertTriangle className="w-4 h-4" />
    }
    if (operation.includes('Delete')) {
      return <Trash2 className="w-4 h-4" />
    }
    if (operation.includes('Update')) {
      return <RefreshCw className="w-4 h-4" />
    }
    if (operation.includes('Insert')) {
      return <Database className="w-4 h-4" />
    }
    return <Database className="w-4 h-4" />
  }

  return (
    <Container size="large" padding="large" className="py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-github-text-primary mb-2">
              Database Operation Logs
            </h1>
            <p className="text-github-text-secondary">
              Monitor and track all database operations to prevent unauthorized changes
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={loadLogs}
              disabled={loading}
              variant="primary"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              iconPosition="left"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>

            <Button
              onClick={clearLogs}
              variant="outline"
              icon={<Trash2 className="w-4 h-4" />}
              iconPosition="left"
            >
              Clear Logs
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-github-bg-muted border border-github-border-primary rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-4 h-4 text-github-text-secondary" />
            <h3 className="font-medium text-github-text-primary">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-github-text-primary mb-1">
                Operation
              </label>
              <input
                type="text"
                value={filter.operation}
                onChange={(e) => setFilter({...filter, operation: e.target.value})}
                placeholder="e.g., InsertUser, UpdateUser"
                className="w-full px-3 py-2 border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-github-text-primary mb-1">
                Table Name
              </label>
              <input
                type="text"
                value={filter.tableName}
                onChange={(e) => setFilter({...filter, tableName: e.target.value})}
                placeholder="e.g., users, avatars"
                className="w-full px-3 py-2 border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-github-text-primary mb-1">
                User ID
              </label>
              <input
                type="number"
                value={filter.userId}
                onChange={(e) => setFilter({...filter, userId: e.target.value})}
                placeholder="User ID"
                className="w-full px-3 py-2 border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filter.showDangerousOnly}
                  onChange={(e) => setFilter({...filter, showDangerousOnly: e.target.checked})}
                  className="rounded border-github-border-primary"
                />
                <span className="text-sm text-github-text-primary">Dangerous Operations Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-github-bg-muted border border-github-border-primary rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-github-accent-primary" />
              <span className="text-sm font-medium text-github-text-primary">Total Operations</span>
            </div>
            <p className="text-2xl font-bold text-github-text-primary mt-2">{logs.length}</p>
          </div>
          <div className="bg-github-bg-muted border border-github-border-primary rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-github-accent-primary" />
              <span className="text-sm font-medium text-github-text-primary">User Operations</span>
            </div>
            <p className="text-2xl font-bold text-github-text-primary mt-2">
              {logs.filter(log => log.tableName === 'users').length}
            </p>
          </div>
          <div className="bg-github-bg-muted border border-github-border-primary rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Image className="w-5 h-5 text-github-accent-primary" />
              <span className="text-sm font-medium text-github-text-primary">Avatar Operations</span>
            </div>
            <p className="text-2xl font-bold text-github-text-primary mt-2">
              {logs.filter(log => log.tableName === 'avatars').length}
            </p>
          </div>
          <div className="bg-github-bg-muted border border-github-border-primary rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-github-text-primary">Dangerous Operations</span>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-2">
              {logs.filter(log => {
                const dangerousOps = ['CreateTable', 'DropTable', 'TruncateTable', 'ResetDatabase']
                return dangerousOps.some(op => log.operation.includes(op))
              }).length}
            </p>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-github-bg-primary border border-github-border-primary rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-github-bg-muted border-b border-github-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-github-text-primary">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-github-text-primary">Operation</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-github-text-primary">Table</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-github-text-primary">User ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-github-text-primary">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-github-border-primary">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-github-text-secondary">
                      {logs.length === 0 ? 'No database operations logged yet.' : 'No logs match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-github-bg-muted">
                      <td className="px-4 py-3 text-sm text-github-text-secondary">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getOperationColor(log.operation)}`}>
                          {getOperationIcon(log.operation)}
                          <span>{log.operation}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-github-text-primary">
                        {log.tableName}
                      </td>
                      <td className="px-4 py-3 text-sm text-github-text-secondary">
                        {log.userId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-github-text-secondary">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default DatabaseLogPage
