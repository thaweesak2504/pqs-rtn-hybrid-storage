import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { SlideBarProvider } from './contexts/SlideBarContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { useZoomShortcuts } from './hooks/useZoomShortcuts';
import { logger } from './utils/logger';

// Import pages
import SignInPage from './components/pages/SignInPage';
import RegistrationPage from './components/pages/RegistrationPage';
import EditorPage from './components/pages/EditorPage';
import HistoryPage from './components/pages/HistoryPage';
import TeamPage from './components/pages/TeamPage';
import ContactPage from './components/pages/ContactPage';
import VisitorPage from './components/pages/VisitorPage';

import DatabaseViewerPage from './components/pages/DatabaseViewerPage';
;

import DashboardPage from './components/pages/DashboardPage';
import HighRanksPage from './components/pages/HighRanksPage';
import DatabaseManagementPage from './components/pages/DatabaseManagementPage';

// Import layouts
import UnifiedLayout from './components/UnifiedLayout';

// Import components
import HeroSection from './components/HeroSection';
import DebugRoute from './components/DebugRoute';
import GlobalRedirect from './components/GlobalRedirect';

// Tauri commands are handled by individual components

// Database initialization is handled by Tauri setup

function App() {
  // Enable zoom shortcuts globally
  useZoomShortcuts();

  useEffect(() => {
    // Database initialization is handled by Tauri setup
    // No need to call from frontend to prevent double initialization
    
    // Test logger system
    logger.info('React App initialized');
    logger.debug('Running in development mode:', import.meta.env.DEV);
    logger.debug('Environment:', import.meta.env.MODE);
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
          <AuthProvider>
            <UserProfileProvider>
              <BreadcrumbProvider>
                <SlideBarProvider>
                  <LayoutProvider>
                    <GlobalRedirect />
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
                          <Route path="visitor" element={<VisitorPage />} />
                          
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
        </ToastProvider>
      </DarkModeProvider>
    </Router>
  );
}

export default App;
