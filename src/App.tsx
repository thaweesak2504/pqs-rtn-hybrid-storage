import { useEffect, useRef } from 'react';
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { InitializationProvider } from './contexts/InitializationContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { SlideBarProvider } from './contexts/SlideBarContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { useZoomShortcuts } from './hooks/useZoomShortcuts';
import { logger } from './utils/logger';

// Import pages
import ActiveDocumentPage from './components/pages/ActiveDocumentPage';
import ContactPage from './components/pages/ContactPage';
import EditorPage from './components/pages/EditorPage';
import HistoryPage from './components/pages/HistoryPage';
import PqsExamplePage from './components/pages/PqsExamplePage';
import RegistrationPage from './components/pages/RegistrationPage';
import SignInPage from './components/pages/SignInPage';
import TeamPage from './components/pages/TeamPage';
// import VisitorPage from './components/pages/VisitorPage'; // Retired

import DatabaseViewerPage from './components/pages/DatabaseViewerPage';
;

import DashboardPage from './components/pages/DashboardPage';
import DatabaseManagementPage from './components/pages/DatabaseManagementPage';
import HighRanksPage from './components/pages/HighRanksPage';

// Import layouts
import UnifiedLayout from './components/UnifiedLayout';

// Import components
import DebugRoute from './components/DebugRoute';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import GlobalRedirect from './components/GlobalRedirect';
import HeroSection from './components/HeroSection';

// Tauri commands are handled by individual components

// Database initialization is handled by Tauri setup

function App() {
  // Enable zoom shortcuts globally
  useZoomShortcuts();

  // Prevent duplicate logging in Strict Mode
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // Database initialization is handled by Tauri setup
    // No need to call from frontend to prevent double initialization

    // Test logger system (only once due to Strict Mode)
    if (import.meta.env.DEV && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logger.info('React App initialized');
      logger.debug('Running in development mode:', import.meta.env.DEV);
      logger.debug('Environment:', import.meta.env.MODE);
    }
  }, [])

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <DarkModeProvider>
        <ToastProvider>
          <InitializationProvider>
            <AuthProvider>
              <UserProfileProvider>
                <BreadcrumbProvider>
                  <SlideBarProvider>
                    <LayoutProvider>
                      <GlobalRedirect />
                      {/* Globally-mounted gate: renders null unless the currently
                          authenticated user has must_change_password=true, in which
                          case it displays a non-dismissible modal that blocks the UI
                          until a strong password is set (see Phase 1 security). */}
                      <ForceChangePasswordModal />
                      <div className="min-h-screen bg-github-bg-primary transition-colors duration-200 overflow-y-auto">
                        <Routes>
                          {/* All routes with UnifiedLayout */}
                          <Route path="/" element={<UnifiedLayout />}>
                            <Route index element={<Navigate to="/home" replace />} />
                            <Route path="home" element={<HeroSection />} />
                            <Route path="signin" element={<SignInPage />} />
                            <Route path="registration" element={<RegistrationPage />} />
                            <Route path="register" element={<RegistrationPage />} />
                            <Route path="history" element={<HistoryPage />} />
                            <Route path="team" element={<TeamPage />} />
                            <Route path="contact" element={<ContactPage />} />

                            {/* Editor and Visitor routes */}
                            <Route path="editor" element={<EditorPage />} />
                            <Route path="example" element={<PqsExamplePage />} />
                            <Route path="pqs/:docId" element={<ActiveDocumentPage />} />

                            {/* Admin Dashboard routes */}
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="dashboard/database" element={<DatabaseViewerPage />} />

                            <Route path="dashboard/highranks" element={<HighRanksPage />} />
                            <Route path="dashboard/management" element={<DatabaseManagementPage />} />

                            {/* Catch all - redirect to home */}
                            <Route path="*" element={<DebugRoute />} />
                          </Route>
                        </Routes>
                      </div>
                    </LayoutProvider>
                  </SlideBarProvider>
                </BreadcrumbProvider>
              </UserProfileProvider>
            </AuthProvider>
          </InitializationProvider>
        </ToastProvider>
      </DarkModeProvider>
    </Router>
  );
}

export default App;
