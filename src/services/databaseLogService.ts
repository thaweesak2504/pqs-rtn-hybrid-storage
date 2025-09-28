import { safeInvoke } from './tauriService'

export interface DatabaseLogEntry {
  timestamp: string
  operation: string
  tableName: string
  userId?: number
  affectedRows?: number
  details: string
}

export class DatabaseLogService {
  /**
   * Get all database operation logs
   */
  static async getLogs(): Promise<string> {
    try {
      return await safeInvoke<string>('get_database_logs')
    } catch (error) {
      console.error('Failed to get database logs:', error)
      throw new Error('Failed to retrieve database logs')
    }
  }

  /**
   * Clear all database operation logs
   */
  static async clearLogs(): Promise<string> {
    try {
      return await safeInvoke<string>('clear_database_logs')
    } catch (error) {
      console.error('Failed to clear database logs:', error)
      throw new Error('Failed to clear database logs')
    }
  }

  /**
   * Parse log entries from raw log string
   */
  static parseLogs(logString: string): DatabaseLogEntry[] {
    if (!logString || logString.trim() === 'No database logs found yet.') {
      return []
    }

    const lines = logString.split('\n').filter(line => line.trim())
    const entries: DatabaseLogEntry[] = []

    for (const line of lines) {
      try {
        // Parse log format: [timestamp] operation | Table: tableName | User: userId | Rows: rows | Details: details
        const match = line.match(/\[([^\]]+)\] ([^|]+) \| Table: ([^|]+) \| User: ([^|]+) \| Rows: ([^|]+) \| Details: (.+)/)
        
        if (match) {
          const [, timestamp, operation, tableName, userStr, rowsStr, details] = match
          
          entries.push({
            timestamp: timestamp.trim(),
            operation: operation.trim(),
            tableName: tableName.trim(),
            userId: userStr.trim() === 'N/A' ? undefined : parseInt(userStr.trim()),
            affectedRows: rowsStr.trim() === 'N/A' ? undefined : parseInt(rowsStr.trim()),
            details: details.trim()
          })
        }
      } catch (error) {
        console.warn('Failed to parse log line:', line, error)
      }
    }

    return entries
  }

  /**
   * Get logs with filtering options
   */
  static async getFilteredLogs(options: {
    operation?: string
    tableName?: string
    userId?: number
    limit?: number
  } = {}): Promise<DatabaseLogEntry[]> {
    const allLogs = await this.getLogs()
    let entries = this.parseLogs(allLogs)

    // Apply filters
    if (options.operation) {
      entries = entries.filter(entry => 
        entry.operation.toLowerCase().includes(options.operation!.toLowerCase())
      )
    }

    if (options.tableName) {
      entries = entries.filter(entry => 
        entry.tableName.toLowerCase().includes(options.tableName!.toLowerCase())
      )
    }

    if (options.userId) {
      entries = entries.filter(entry => entry.userId === options.userId)
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      entries = entries.slice(0, options.limit)
    }

    return entries
  }

  /**
   * Get dangerous operations (CreateTable, DropTable, TruncateTable, ResetDatabase)
   */
  static async getDangerousOperations(): Promise<DatabaseLogEntry[]> {
    const allLogs = await this.getLogs()
    const entries = this.parseLogs(allLogs)
    
    const dangerousOps = ['CreateTable', 'DropTable', 'TruncateTable', 'ResetDatabase']
    
    return entries.filter(entry => 
      dangerousOps.some(op => entry.operation.includes(op))
    )
  }

  /**
   * Get user-related operations
   */
  static async getUserOperations(userId?: number): Promise<DatabaseLogEntry[]> {
    return this.getFilteredLogs({
      tableName: 'users',
      userId
    })
  }

  /**
   * Get avatar-related operations
   */
  static async getAvatarOperations(userId?: number): Promise<DatabaseLogEntry[]> {
    return this.getFilteredLogs({
      tableName: 'avatars',
      userId
    })
  }
}

export default DatabaseLogService
