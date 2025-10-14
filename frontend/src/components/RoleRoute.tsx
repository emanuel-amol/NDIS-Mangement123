import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authProvider } from '../lib/auth-provider';

interface RoleRouteProps {
  allow: string[];
  children: ReactElement;
}

export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Get role from user object
  const role = user?.user_metadata?.role || user?.role || 'USER';

  if (!allow.includes(role.toUpperCase())) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}