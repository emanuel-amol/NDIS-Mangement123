import { auth } from "../services/auth";

export const hasRole = (...roles: string[]): boolean => {
  const current = (auth.role() || "").toUpperCase();
  return roles.some(role => role.toUpperCase() === current);
};

