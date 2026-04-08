// App.tsx

import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store, type AppDispatch } from './app/store';
import { router } from './app/routes';
// import './styles/global.css';
import { initializeAuth } from './features/auth/slices/authSlice';
import './styles/output.css';

/**
 * Fires initializeAuth once on mount.
 * This validates the stored token via GET /me and sets isInitialized = true
 * when done (success or failure), unblocking all ProtectedRoute guards.
 */
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return <>{children}</>;
};

function AppContent() {
  return (
    <AuthInitializer>
      <RouterProvider router={router} />
    </AuthInitializer>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;