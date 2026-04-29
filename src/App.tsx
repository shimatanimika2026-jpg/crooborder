import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AppRoutes } from './AppRoutes';
import '@/i18n';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <PermissionsProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </PermissionsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
