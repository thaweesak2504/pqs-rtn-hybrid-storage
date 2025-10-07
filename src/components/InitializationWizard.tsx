import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import Button from './ui/Button';
import Card from './ui/Card';
import { AlertTriangle, Database, FileText, Clock, HardDrive, FolderOpen } from 'lucide-react';

interface BackupManifest {
  version: string;
  timestamp: number;
  database_size: number;
  media_size: number;
  total_files: number;
  backup_type: string;
  checksum: string;
}

interface BackupInfo {
  filename: string;
  path: string;
  manifest: BackupManifest;
}

interface InitializationBackupInfo {
  has_backups: boolean;
  latest_backup?: BackupInfo;
  total_backups: number;
}

interface SystemStateInfo {
  database_exists_and_valid: boolean;
  media_exists_and_valid: boolean;
  backup_info: InitializationBackupInfo;
}

interface InitializationWizardProps {
  onComplete: () => void;
  onSkip: () => void;
  systemState?: SystemStateInfo;
}

const InitializationWizard: React.FC<InitializationWizardProps> = ({ onComplete, onSkip, systemState }) => {
  const [backupInfo, setBackupInfo] = useState<InitializationBackupInfo | null>(systemState?.backup_info || null);
  const [isLoading, setIsLoading] = useState(!systemState);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have system state from props, use it
    if (systemState?.backup_info) {
      setBackupInfo(systemState.backup_info);
      setIsLoading(false);
    } else {
      // Otherwise, fetch backup info
      checkForBackups();
    }
  }, [systemState]);

  const checkForBackups = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<string>('check_backup_for_initialization');
      const info: InitializationBackupInfo = JSON.parse(result);
      setBackupInfo(info);
    } catch (err) {
      console.error('Failed to check for backups:', err);
      setError('Failed to check for existing backups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportBackup = async (customPath?: string) => {
    const backupPath = customPath || backupInfo?.latest_backup?.path;
    if (!backupPath) return;

    const backupInfo_ = backupInfo?.latest_backup;
    const userInput = prompt(`⚠️ RESTORE FROM BACKUP\n\n${backupInfo_ ? `This will restore the application from the backup:\n\n📅 Created: ${new Date(backupInfo_.manifest.timestamp * 1000).toLocaleString()}\n💾 Database: ${(backupInfo_.manifest.database_size / 1024 / 1024).toFixed(2)} MB\n📁 Media: ${(backupInfo_.manifest.media_size / 1024 / 1024).toFixed(2)} MB\n📄 Files: ${backupInfo_.manifest.total_files}\n\n` : `This will restore from the selected backup file.\n\n`}⚠️ This will REPLACE all current data and cannot be undone!\n\nType "RESTORE" to confirm (case sensitive):`);

    if (userInput !== 'RESTORE') {
      alert('Backup restore cancelled.');
      return;
    }

    try {
      setIsImporting(true);
      const result = await invoke<string>('import_hybrid_backup', {
        zipPath: backupPath
      });
      alert(`✅ Backup restored successfully!\n\n${result}`);
      onComplete();
    } catch (err) {
      console.error('Failed to import backup:', err);
      alert(`❌ Failed to restore backup: ${err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBrowseBackup = async () => {
    try {
      const selected = await open({
        title: 'Select Backup File',
        multiple: false,
        filters: [{
          name: 'Backup Files',
          extensions: ['zip']
        }]
      });

      if (selected && typeof selected === 'string') {
        await handleImportBackup(selected);
      }
    } catch (err) {
      console.error('Failed to select backup file:', err);
      alert(`❌ Failed to select backup file: ${err}`);
    }
  };

  const handleCreateNew = () => {
    const confirmed = confirm('Create new database?\n\nThis will create a fresh database with default admin user.\nYou can still import backups later from the Database Management page.');
    if (confirmed) {
      onSkip();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-github-bg-primary flex items-center justify-center">
      <Card className="w-full max-w-md">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-blue mx-auto mb-4"></div>
          <p className="text-github-fg-muted">Checking for existing backups...</p>
        </div>
      </Card>
      </div>
    );
  }

  // No backups found - show simple setup wizard
  if (error || !backupInfo?.has_backups) {
    return (
      <div className="min-h-screen bg-github-bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-github-orange">
            <AlertTriangle className="w-5 h-5" />
            System Setup Required
          </h2>
          <div className="space-y-6">
            <div className="bg-github-canvas-subtle rounded-lg p-4 border border-github-border-default">
              <div className="text-sm space-y-2">
                {!systemState?.database_exists_and_valid && !systemState?.media_exists_and_valid && (
                  <p className="text-github-fg-default">⚠️ Database and media files are missing or corrupted.</p>
                )}
                {!systemState?.database_exists_and_valid && systemState?.media_exists_and_valid && (
                  <p className="text-github-fg-default">⚠️ Database is missing or corrupted, but media files exist.</p>
                )}
                {systemState?.database_exists_and_valid && !systemState?.media_exists_and_valid && (
                  <p className="text-github-fg-default">⚠️ Database exists but media files are missing.</p>
                )}
                <p className="text-github-fg-muted mt-2">
                  {error 
                    ? '⚠️ Unable to check system state.' 
                    : '📦 No backup files found in the backups directory.'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBrowseBackup}
                disabled={isImporting}
                variant="primary"
                className="w-full"
                icon={<FolderOpen className="w-4 h-4" />}
                iconPosition="left"
              >
                Browse for Backup File
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-github-border-default"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-github-bg-primary px-2 text-github-fg-muted">or</span>
                </div>
              </div>

              <Button
                onClick={handleCreateNew}
                variant="outline"
                className="w-full"
              >
                🆕 Create New Database
              </Button>
            </div>

            <p className="text-xs text-github-fg-muted text-center">
              You can manage backups later in Database Management → Hybrid Backups
            </p>
          </div>
        </div>
      </Card>
      </div>
    );
  }

  const latestBackup = backupInfo.latest_backup!;
  const backupDate = new Date(latestBackup.manifest.timestamp * 1000);

  return (
    <div className="min-h-screen bg-github-bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-github-orange">
            <AlertTriangle className="w-5 h-5" />
            Backup Found - Choose Setup Option
          </h2>
          <div className="space-y-6">
            <div className="bg-github-canvas-subtle rounded-lg p-4 border border-github-border-default">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Latest Available Backup
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-github-fg-muted" />
                <span>Created: {backupDate.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-github-fg-muted" />
                <span>Database: {(latestBackup.manifest.database_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-github-fg-muted" />
                <span>Media Files: {(latestBackup.manifest.media_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-github-fg-muted" />
                <span>Total Files: {latestBackup.manifest.total_files}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleImportBackup()}
              disabled={isImporting}
              className="w-full"
              variant="primary"
            >
              {isImporting ? 'Restoring...' : '🔄 Restore from Latest Backup'}
            </Button>

            <Button
              onClick={handleBrowseBackup}
              disabled={isImporting}
              variant="outline"
              className="w-full"
              icon={<FolderOpen className="w-4 h-4" />}
              iconPosition="left"
            >
              Browse for Other Backup File
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-github-border-default"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-github-bg-primary px-2 text-github-fg-muted">or</span>
              </div>
            </div>

            <Button
              onClick={handleCreateNew}
              variant="outline"
              className="w-full"
            >
              🆕 Create New Database
            </Button>
          </div>

          <p className="text-xs text-github-fg-muted text-center">
            You can manage backups later in Database Management → Hybrid Backups
          </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InitializationWizard;