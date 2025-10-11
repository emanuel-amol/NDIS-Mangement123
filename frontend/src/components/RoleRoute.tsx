import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { auth } from '../services/auth';

interface RoleRouteProps {
  allow: string[];
  children: ReactElement;
}

export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const token = auth.token();
  const role = auth.role();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
