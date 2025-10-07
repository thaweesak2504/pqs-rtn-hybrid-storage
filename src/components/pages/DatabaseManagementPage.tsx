import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Container, Title, Card, Button, Alert, CustomSelect } from '../ui';
import { Database, Download, Upload, Trash2, RefreshCw, FileText, Archive, Package } from 'lucide-react';

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
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'sql'>('sql');

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
      const exportList = await invoke<string[]>('list_database_exports');
      setExports(exportList.map(filename => ({ filename })));
    } catch (error) {
      console.error('Error loading exports:', error);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Backup functions
  const createBackup = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('create_database_backup');
      showMessage('success', result);
      loadBackups();
    } catch (error) {
      showMessage('error', `Failed to create backup: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const createStandardSQLDump = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('create_standard_sql_dump');
      showMessage('success', result);
      loadExports();
    } catch (error) {
      showMessage('error', `Failed to create SQL dump: ${error}`);
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

  // Export functions
  const exportDatabase = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('export_database', { format: selectedFormat });
      showMessage('success', result);
      loadExports();
    } catch (error) {
      showMessage('error', `Failed to export database: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const importDatabase = async (filename: string) => {
    if (!confirm(`Are you sure you want to import from ${filename}? This will replace all current data.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<string>('import_database', { importFilename: filename });
      showMessage('success', result);
      loadExports();
    } catch (error) {
      showMessage('error', `Failed to import database: ${error}`);
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
        {/* Backup Section */}
        <Card className="h-fit">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Archive className="w-6 h-6 text-github-accent-primary" />
              <h2 className="text-xl font-semibold text-github-text-primary">
                Database Backups
              </h2>
            </div>

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
              <Button
                onClick={createBackup}
                disabled={true}
                variant="outline"
                className="w-full opacity-50"
                icon={<Database className="w-4 h-4" />}
                iconPosition="left"
              >
                Create JSON Backup (Disabled)
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-github-text-primary mb-3">
                Available Backups ({backups.length})
              </h3>
              {backups.length === 0 ? (
                <p className="text-github-text-secondary text-sm">
                  No backups available
                </p>
              ) : (
                backups.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-github-bg-secondary rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-github-text-secondary mr-2" />
                      <div className="flex flex-col">
                        <span className="text-sm text-github-text-primary font-medium">
                          {backup.filename}
                        </span>
                        <span className="text-xs text-github-text-secondary">
                          {new Date(backup.timestamp * 1000).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Bangkok'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => restoreBackup(backup.filename)}
                        disabled={isLoading}
                        icon={<Upload className="w-3 h-3" />}
                        iconPosition="left"
                      >
                        Restore
                      </Button>
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => deleteBackup(backup.filename)}
                        disabled={isLoading}
                        icon={<Trash2 className="w-3 h-3" />}
                        iconPosition="left"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Hybrid Backups Section */}
            <div className="space-y-2 mt-6 pt-6 border-t border-github-border-primary">
              <h3 className="font-medium text-github-text-primary mb-3">
                Hybrid Backups (Database + Media) ({Array.isArray(hybridBackups) ? hybridBackups.length : 0})
              </h3>
              {!Array.isArray(hybridBackups) || hybridBackups.length === 0 ? (
                <p className="text-github-text-secondary text-sm">
                  No hybrid backups available
                </p>
              ) : (
                hybridBackups.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-github-bg-secondary rounded-lg">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-github-accent-primary mr-2" />
                      <div className="flex flex-col">
                        <span className="text-sm text-github-text-primary font-medium">
                          {backup.filename}
                        </span>
                        <span className="text-xs text-github-text-secondary">
                          Database: {(backup.manifest.database_size / 1024).toFixed(1)} KB, 
                          Media: {(backup.manifest.media_size / 1024).toFixed(1)} KB, 
                          Files: {backup.manifest.total_files}
                        </span>
                        <span className="text-xs text-github-text-tertiary">
                          {new Date(backup.manifest.timestamp * 1000).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Bangkok'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="small"
                        onClick={() => importHybridBackup(backup.path)}
                        disabled={isLoading}
                        icon={<Upload className="w-3 h-3" />}
                        iconPosition="left"
                      >
                        Import
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Export/Import Section */}
        <Card className="h-fit">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-github-accent-primary" />
            <h2 className="text-xl font-semibold text-github-text-primary">
              Export/Import
            </h2>
          </div>

          <div className="mb-4">
            <div className="mb-3">
              <CustomSelect
                name="exportFormat"
                value={selectedFormat}
                onChange={(e) => {
                  const value = e.target.value as 'json' | 'csv' | 'sql';
                  setSelectedFormat(value);
                }}
                label="Export Format"
                placeholder="Select export format"
                icon={Database}
                options={[
                  { value: 'sql', label: 'SQL' },
                  { value: 'json', label: 'JSON (Disabled)', disabled: true },
                  { value: 'csv', label: 'CSV (Disabled)', disabled: true }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Button
                onClick={exportDatabase}
                disabled={isLoading}
                className="w-full"
                icon={<Download className="w-4 h-4" />}
                iconPosition="left"
              >
                Export Database
              </Button>
              <Button
                onClick={createStandardSQLDump}
                disabled={isLoading}
                variant="outline"
                className="w-full"
                icon={<FileText className="w-4 h-4" />}
                iconPosition="left"
              >
                Create Standard SQL Dump
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-github-text-primary mb-3">
              Available Exports ({exports.length})
            </h3>
            {exports.length === 0 ? (
              <p className="text-github-text-secondary text-sm">
                No exports available
              </p>
            ) : (
              exports.map((exportFile, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-github-bg-secondary rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-github-text-secondary mr-2" />
                    <span className="text-sm text-github-text-primary">
                      {exportFile.filename}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => importDatabase(exportFile.filename)}
                      disabled={isLoading}
                      icon={<Upload className="w-3 h-3" />}
                      iconPosition="left"
                    >
                      Import
                    </Button>
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => deleteExport(exportFile.filename)}
                      disabled={isLoading}
                      icon={<Trash2 className="w-3 h-3" />}
                      iconPosition="left"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
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
