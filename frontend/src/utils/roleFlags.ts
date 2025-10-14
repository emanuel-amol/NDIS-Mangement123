import { useAuth } from '../contexts/AuthContext';

export const hasRole = (...roles: string[]): boolean => {
  const current = ((user?.role || user?.user_metadata?.role || '') || "").toUpperCase();
  return roles.some(role => role.toUpperCase() === current);
};

