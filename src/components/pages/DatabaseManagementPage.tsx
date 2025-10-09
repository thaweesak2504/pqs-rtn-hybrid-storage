import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { Container, Title, Card, Button, Alert } from '../ui';
import { Database, Download, Trash2, RefreshCw, FileText, Archive, Package, RotateCcw, FileInput, Shield } from 'lucide-react';

interface BackupFile {
  filename: string;
  size?: number;
  created?: string;
  timestamp: number;
}

interface BackupManifest {
  version: string;
  timestamp: number;
  database_size: number;
  media_size: number;
  total_files: number;
  backup_type: string;
  checksum: string;
}

interface HybridBackupFile {
  filename: string;
  path: string;
  manifest: BackupManifest;
}

interface ExportFile {
  filename: string;
  size?: number;
  created?: string;
}

const DatabaseManagementPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [hybridBackups, setHybridBackups] = useState<HybridBackupFile[]>([]);
  const [exports, setExports] = useState<ExportFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load backups and exports on component mount
  useEffect(() => {
    loadBackups();
    loadHybridBackups();
    loadExports();
  }, []);

  const loadBackups = async () => {
    try {
      const backupList = await invoke<BackupFile[]>('list_database_backups');
      setBackups(backupList);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadHybridBackups = async () => {
    try {
      const hybridBackupListJson = await invoke<string>('discover_hybrid_backups');
      const hybridBackupList: HybridBackupFile[] = JSON.parse(hybridBackupListJson);
      setHybridBackups(hybridBackupList);
    } catch (error) {
      console.error('Error loading hybrid backups:', error);
      setHybridBackups([]); // Set empty array on error
    }
  };

  const loadExports = async () => {
    try {
      const exportListJson = await invoke<string>('list_database_exports');
      const exportList: ExportFile[] = JSON.parse(exportListJson);
      setExports(exportList);
    } catch (error) {
      console.error('Error loading exports:', error);
      setExports([]); // Set empty array on error
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Backup functions
  const createUniversalBackup = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('create_universal_sqlite_backup');
      showMessage('success', result);
      loadBackups();
    } catch (error) {
      showMessage('error', `Failed to create universal backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createHybridBackup = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('create_hybrid_backup');
      showMessage('success', result);
      loadHybridBackups(); // Reload hybrid backup list
    } catch (error) {
      showMessage('error', `Failed to create hybrid backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const importHybridBackup = async (backupPath: string) => {
    const userInput = prompt(`⚠️ Are you sure you want to import hybrid backup?\n\nThis will replace ALL current data (database + media files) and cannot be undone!\n\nType "IMPORT" to confirm (case sensitive):`);
    
    if (userInput !== "IMPORT") {
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<string>('import_hybrid_backup', { zipPath: backupPath });
      showMessage('success', result);
      // Reload data after import
      loadBackups();
      loadHybridBackups();
    } catch (error) {
      showMessage('error', `Failed to import hybrid backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHybridBackup = async (filename: string) => {
    const userInput = prompt(`⚠️ Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone!\n\nType "DELETE" to confirm (case sensitive):`);
    
    if (userInput !== "DELETE") {
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<string>('delete_hybrid_backup', { filename });
      showMessage('success', result);
      loadHybridBackups(); // Reload list after delete
    } catch (error) {
      showMessage('error', `Failed to delete hybrid backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    // Use a more reliable confirmation method
    const userInput = prompt(`⚠️ Are you sure you want to restore from "${filename}"?\n\nThis will replace ALL current data and cannot be undone!\n\nType "RESTORE" to confirm (case sensitive):`);
    
    // If user cancels or doesn't type RESTORE, stop here
    if (userInput !== "RESTORE") {
      showMessage('info', '❌ Restore operation cancelled by user');
      return;
    }

    // User confirmed, proceed with restore
    setIsLoading(true);
    showMessage('info', `🔄 Restoring database from ${filename}... Please wait.`);
    
    try {
      const result = await invoke<string>('restore_database_backup', { backupFilename: filename });
      showMessage('success', `✅ ${result}`);
      
      // Show countdown notification
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        showMessage('info', `🔄 Database restored successfully! Auto-refreshing in ${countdown} seconds...`);
        countdown--;
        
        if (countdown < 0) {
          clearInterval(countdownInterval);
          showMessage('success', '🔄 Refreshing application now...');
          window.location.reload();
        }
      }, 1000);
      
      loadBackups();
    } catch (error) {
      showMessage('error', `❌ Failed to restore backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    // Use a more reliable confirmation method
    const userInput = prompt(`🗑️ Are you sure you want to delete backup "${filename}"?\n\nType "DELETE" to confirm (case sensitive):`);
    
    // If user cancels or doesn't type DELETE, stop here
    if (userInput !== "DELETE") {
      showMessage('info', '❌ Delete operation cancelled by user');
      return;
    }

    // User confirmed, proceed with delete
    setIsLoading(true);
    showMessage('info', `🗑️ Deleting backup ${filename}...`);
    
    try {
      const result = await invoke<string>('delete_database_backup', { backupFilename: filename });
      showMessage('success', `✅ ${result}`);
      loadBackups();
    } catch (error) {
      showMessage('error', `❌ Failed to delete backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export functions for current data
  const createSQLExport = async () => {
    setIsLoading(true);
    try {
      // Create SQL export in exports directory
      const result = await invoke<string>('export_database', {
        format: 'Sql'
      });
      
      showMessage('success', result);
      loadExports(); // Reload export list
    } catch (error) {
      showMessage('error', `Failed to create SQL export: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCurrentDatabase = async () => {
    // Open save dialog to choose export location
    const savePath = await save({
      filters: [{ name: 'SQL File', extensions: ['sql'] }],
      defaultPath: `database_export_${Date.now()}.sql`
    });

    if (!savePath) {
      return; // User cancelled
    }

    setIsLoading(true);
    try {
      // Export SQL and copy to selected location
      const result = await invoke<string>('export_sql_to_location', {
        destinationPath: savePath
      });
      
      showMessage('success', result);
    } catch (error) {
      showMessage('error', `Failed to export database: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCurrentHybrid = async () => {
    // Open save dialog to choose export location
    const savePath = await save({
      filters: [{ name: 'Hybrid Backup', extensions: ['zip'] }],
      defaultPath: `hybrid_export_${Date.now()}.zip`
    });

    if (!savePath) {
      return; // User cancelled
    }

    setIsLoading(true);
    try {
      // Create hybrid backup first
      await invoke<string>('create_hybrid_backup');
      
      // Get the latest backup file
      const hybridBackupListJson = await invoke<string>('discover_hybrid_backups');
      const hybridBackupList: HybridBackupFile[] = JSON.parse(hybridBackupListJson);
      
      if (hybridBackupList.length > 0) {
        // Get the most recent backup (first in the list)
        const latestBackup = hybridBackupList[0];
        
        // Copy to selected location
        const copyResult = await invoke<string>('export_hybrid_backup_to_location', {
          sourceFilename: latestBackup.filename,
          destinationPath: savePath
        });
        
        showMessage('success', copyResult);
        loadHybridBackups();
      } else {
        showMessage('error', 'Failed to create hybrid backup');
      }
    } catch (error) {
      showMessage('error', `Failed to export hybrid backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export functions from backup list
  const exportBackupToFile = async (filename: string) => {
    // Open save dialog to choose export location
    const savePath = await save({
      filters: [{ name: 'Database Backup', extensions: ['db'] }],
      defaultPath: filename
    });

    if (!savePath) {
      return; // User cancelled
    }

    setIsLoading(true);
    try {
      const result = await invoke<string>('export_backup_to_location', {
        sourceFilename: filename,
        destinationPath: savePath
      });
      
      showMessage('success', result);
    } catch (error) {
      showMessage('error', `Failed to export backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportHybridBackupToFile = async (filename: string) => {
    // Open save dialog to choose export location
    const savePath = await save({
      filters: [{ name: 'Hybrid Backup', extensions: ['zip'] }],
      defaultPath: filename
    });

    if (!savePath) {
      return; // User cancelled
    }

    setIsLoading(true);
    try {
      const result = await invoke<string>('export_hybrid_backup_to_location', {
        sourceFilename: filename,
        destinationPath: savePath
      });
      
      showMessage('success', result);
    } catch (error) {
      showMessage('error', `Failed to export hybrid backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportSQLToFile = async (filename: string) => {
    // Open save dialog to choose export location
    const savePath = await save({
      filters: [{ name: 'SQL File', extensions: ['sql'] }],
      defaultPath: filename
    });

    if (!savePath) {
      return; // User cancelled
    }

    setIsLoading(true);
    try {
      // Copy SQL export from exports directory to selected location
      const result = await invoke<string>('copy_sql_export_to_location', {
        sourceFilename: filename,
        destinationPath: savePath
      });
      
      showMessage('success', result);
    } catch (error) {
      showMessage('error', `Failed to export SQL file: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExport = async (filename: string) => {
    // Use a more reliable confirmation method
    const userInput = prompt(`🗑️ Are you sure you want to delete export "${filename}"?\n\nType "DELETE" to confirm (case sensitive):`);
    
    // If user cancels or doesn't type DELETE, stop here
    if (userInput !== "DELETE") {
      showMessage('info', '❌ Delete operation cancelled by user');
      return;
    }

    // User confirmed, proceed with delete
    setIsLoading(true);
    showMessage('info', `🗑️ Deleting export ${filename}...`);
    
    try {
      const result = await invoke<string>('delete_database_export', { exportFilename: filename });
      showMessage('success', `✅ ${result}`);
      loadExports();
    } catch (error) {
      showMessage('error', `❌ Failed to delete export: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="large" padding="large" className="py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-github-accent-primary" />
          <Title title="Database Management" className="mb-0" />
        </div>
        <p className="text-github-text-secondary">
          จัดการฐานข้อมูล สำรองข้อมูล และนำเข้าข้อมูล
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className="mb-6">
          <Alert
            type={message.type === 'success' ? 'success' : message.type === 'error' ? 'error' : 'info'}
            title={message.type === 'success' ? 'สำเร็จ' : message.type === 'error' ? 'เกิดข้อผิดพลาด' : 'ข้อมูล'}
            message={message.text}
            showCloseButton={true}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Backup & Restore Section */}
        <Card className="h-fit p-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Archive className="w-6 h-6 text-github-accent-primary" />
              <h2 className="text-xl font-semibold text-github-text-primary">
                Backup & Restore
              </h2>
            </div>
            <p className="text-github-text-secondary text-sm mb-6">
              สำรองและกู้คืนข้อมูลภายในระบบ
            </p>

            <div className="mb-4 space-y-2">
              <Button
                onClick={createUniversalBackup}
                disabled={isLoading}
                className="w-full"
                icon={<Archive className="w-4 h-4" />}
                iconPosition="left"
              >
                Create Universal SQLite Backup
              </Button>
              <Button
                onClick={createHybridBackup}
                disabled={isLoading}
                className="w-full"
                icon={<Package className="w-4 h-4" />}
                iconPosition="left"
              >
                Create Hybrid Backup (Database + Media)
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-github-text-primary mb-1">
                Available Backups ({backups.length})
              </h3>
              <p className="text-xs text-github-text-secondary mb-3">
                ⚠️ The most recent backup is protected and cannot be deleted.
              </p>
              {backups.length === 0 ? (
                <p className="text-github-text-secondary text-sm">
                  No backups available
                </p>
              ) : (
                backups.map((backup, index) => {
                  const isLatest = index === 0; // First item is the latest
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-github-bg-secondary rounded-lg border border-github-border-primary">
                      <div className="flex items-start flex-1">
                        <FileText className="w-4 h-4 text-github-text-secondary mr-2 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-github-text-primary font-medium break-all">
                              {backup.filename}
                            </p>
                            {isLatest && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-xs font-medium rounded border border-green-500/20">
                                <Shield className="w-3 h-3" />
                                Protected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-github-text-secondary mt-1">
                            {new Date(backup.timestamp * 1000).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'Asia/Bangkok'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2 flex-shrink-0">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => restoreBackup(backup.filename)}
                          disabled={isLoading}
                          icon={<RotateCcw className="w-3 h-3" />}
                          iconPosition="left"
                        >
                          Restore
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => exportBackupToFile(backup.filename)}
                          disabled={isLoading}
                          icon={<Download className="w-3 h-3" />}
                          iconPosition="left"
                        >
                          Export
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => deleteBackup(backup.filename)}
                          disabled={isLoading || isLatest}
                          icon={<Trash2 className="w-3 h-3" />}
                          iconPosition="left"
                          className={isLatest ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Hybrid Backups Section */}
            <div className="space-y-2 mt-6 pt-6 border-t border-github-border-primary">
              <h3 className="font-medium text-github-text-primary mb-1">
                Hybrid Backups (Database + Media) ({Array.isArray(hybridBackups) ? hybridBackups.length : 0})
              </h3>
              <p className="text-xs text-github-text-secondary mb-3">
                ⚠️ The most recent hybrid backup is protected and cannot be deleted.
              </p>
              {!Array.isArray(hybridBackups) || hybridBackups.length === 0 ? (
                <p className="text-github-text-secondary text-sm">
                  No hybrid backups available
                </p>
              ) : (
                hybridBackups.map((backup, index) => {
                  const isLatest = index === 0; // First item is the latest
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-github-bg-secondary rounded-lg border border-github-border-primary">
                      <div className="flex items-start flex-1">
                        <Package className="w-4 h-4 text-github-accent-primary mr-2 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-github-text-primary font-medium break-all">
                              {backup.filename}
                            </p>
                            {isLatest && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-xs font-medium rounded border border-green-500/20">
                                <Shield className="w-3 h-3" />
                                Protected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-github-text-secondary mt-1">
                            Database: {(backup.manifest.database_size / 1024).toFixed(1)} KB, 
                            Media: {(backup.manifest.media_size / 1024).toFixed(1)} KB, 
                            Files: {backup.manifest.total_files}
                          </p>
                          <p className="text-xs text-github-text-tertiary">
                            {new Date(backup.manifest.timestamp * 1000).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'Asia/Bangkok'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2 flex-shrink-0">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => importHybridBackup(backup.path)}
                          disabled={isLoading}
                          icon={<RotateCcw className="w-3 h-3" />}
                          iconPosition="left"
                        >
                          Restore
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => exportHybridBackupToFile(backup.filename)}
                          disabled={isLoading}
                          icon={<Download className="w-3 h-3" />}
                          iconPosition="left"
                        >
                          Export
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => deleteHybridBackup(backup.filename)}
                          disabled={isLoading || isLatest}
                          icon={<Trash2 className="w-3 h-3" />}
                          iconPosition="left"
                          className={isLatest ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Export/Import Section */}
        <Card className="h-fit p-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6 text-github-accent-primary" />
            <h2 className="text-xl font-semibold text-github-text-primary">
              Export/Import
            </h2>
          </div>
          <p className="text-github-text-secondary text-sm mb-6">
            ส่งออกและนำเข้าข้อมูลระหว่างเครื่อง
          </p>

          <div className="mb-4 space-y-2">
            <Button
              onClick={exportCurrentDatabase}
              disabled={isLoading}
              className="w-full"
              icon={<Download className="w-4 h-4" />}
              iconPosition="left"
            >
              Export Current Database (SQL)
            </Button>
            <Button
              onClick={exportCurrentHybrid}
              disabled={isLoading}
              className="w-full"
              icon={<Package className="w-4 h-4" />}
              iconPosition="left"
            >
              Export Current Hybrid (Database + Media)
            </Button>
            <Button
              onClick={async () => {
                const selected = await open({
                  filters: [{ name: 'Hybrid Backup', extensions: ['zip'] }],
                  multiple: false
                });
                if (selected && typeof selected === 'string') {
                  await importHybridBackup(selected);
                }
              }}
              disabled={isLoading}
              className="w-full"
              icon={<FileInput className="w-4 h-4" />}
              iconPosition="left"
            >
              Import from File...
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-github-text-primary">
                Available SQL Exports ({exports.length})
              </h3>
              <Button
                onClick={createSQLExport}
                disabled={isLoading}
                size="small"
                icon={<Database className="w-3 h-3" />}
                iconPosition="left"
              >
                Create SQL Export
              </Button>
            </div>
            <p className="text-xs text-github-text-secondary mb-2">
              ⚠️ The most recent SQL export is protected. Create SQL exports here, then click Export to save to external location.
            </p>
            {exports.length === 0 ? (
              <p className="text-github-text-secondary text-sm">
                No SQL exports available. Create one using "Export Current Database (SQL)" button above.
              </p>
            ) : (
              exports.map((exportFile, index) => {
                const isLatest = index === 0; // First item is the latest
                return (
                  <div key={index} className="p-3 bg-github-bg-secondary rounded-lg border border-github-border-primary">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <Database className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-github-text-primary font-medium break-all">
                              {exportFile.filename}
                            </p>
                            {isLatest && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-xs font-medium rounded border border-green-500/20">
                                <Shield className="w-3 h-3" />
                                Protected
                              </span>
                            )}
                          </div>
                          {exportFile.size && (
                            <p className="text-xs text-github-text-secondary mt-1">
                              {(exportFile.size / 1024).toFixed(2)} KB
                            </p>
                          )}
                          {exportFile.created && (
                            <p className="text-xs text-github-text-secondary">
                              {new Date(exportFile.created).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2 flex-shrink-0">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => exportSQLToFile(exportFile.filename)}
                          disabled={isLoading}
                          icon={<Download className="w-3 h-3" />}
                          iconPosition="left"
                        >
                          Export
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => deleteExport(exportFile.filename)}
                          disabled={isLoading || isLatest}
                          icon={<Trash2 className="w-3 h-3" />}
                          iconPosition="left"
                          className={isLatest ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
      </div>


      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <Button
          onClick={() => {
            loadBackups();
            loadExports();
          }}
          disabled={isLoading}
          variant="outline"
          icon={<RefreshCw className="w-4 h-4" />}
          iconPosition="left"
        >
          Refresh
        </Button>
      </div>
    </Container>
  );
};

export default DatabaseManagementPage;
