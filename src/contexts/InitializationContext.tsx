import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { logger } from '../utils/logger';
import InitializationWizard from '../components/InitializationWizard';

interface InitializationContextType {
  showWizard: boolean;
  setShowWizard: (show: boolean) => void;
  isInitialized: boolean;
  setIsInitialized: (initialized: boolean) => void;
}

const InitializationContext = React.createContext<InitializationContextType | undefined>(undefined);

interface InitializationProviderProps {
  children: ReactNode;
}

export const InitializationProvider: React.FC<InitializationProviderProps> = ({ children }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemState, setSystemState] = useState<{
    database_exists_and_valid: boolean;
    media_exists_and_valid: boolean;
    backup_info: { has_backups: boolean; total_backups: number; [key: string]: unknown };
  } | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Check if initialization is needed on app start
  useEffect(() => {
    if (hasChecked) {
      return;
    }
    
    const checkInitialization = async () => {
      setHasChecked(true);
      
      try {
        logger.info('🔄 Checking system state for initialization...');
        // ALWAYS check system state first (ignore localStorage until database is verified)
        const { invoke } = await import('@tauri-apps/api/tauri');
        const result = await invoke<string>('check_system_state_for_initialization');
        const state = JSON.parse(result);
        setSystemState(state);
        
        logger.info('📊 System state:', JSON.stringify(state));

        // If both database and media exist and are valid, skip initialization wizard
        if (state.database_exists_and_valid && state.media_exists_and_valid) {
          logger.info('✅ Database and media valid, skipping wizard');
          setIsInitialized(true);
          localStorage.setItem('pqs_initialization_completed', 'true');
          return;
        }

        // Database or media is missing - clear localStorage flag
        logger.info('⚠️ Database or media missing, clearing initialization flag');
        localStorage.removeItem('pqs_initialization_completed');

        logger.info('⚠️ Database or media missing, showing initialization wizard');
        // Always show wizard when database or media is missing
        // Let user choose whether to restore from backup or create new
        setShowWizard(true);
      } catch (error) {
        logger.error('❌ Failed to check initialization:', error);
        // On error, assume initialized to prevent blocking the app
        setIsInitialized(true);
        localStorage.setItem('pqs_initialization_completed', 'true');
      }
    };

    checkInitialization();
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWizardComplete = useCallback(async () => {
    setShowWizard(false);
    setIsInitialized(true);
    localStorage.setItem('pqs_initialization_completed', 'true');
  }, []);

  const handleWizardSkip = useCallback(async () => {
    setShowWizard(false);
    // Initialize new database when user chooses to skip backup restore
    await initializeDatabaseIfNeeded();
    setIsInitialized(true);
    localStorage.setItem('pqs_initialization_completed', 'true');
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeDatabaseIfNeeded = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke<string>('initialize_database_if_needed');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      // Continue anyway - the app might still work
    }
  }, []);

  const value: InitializationContextType = {
    showWizard,
    setShowWizard,
    isInitialized,
    setIsInitialized,
  };

  return (
    <InitializationContext.Provider value={value}>
      {showWizard ? (
        <InitializationWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
          systemState={systemState || undefined}
        />
      ) : (
        children
      )}
    </InitializationContext.Provider>
  );
};

export const useInitialization = () => {
  const context = React.useContext(InitializationContext);
  if (context === undefined) {
    throw new Error('useInitialization must be used within an InitializationProvider');
  }
  return context;
};