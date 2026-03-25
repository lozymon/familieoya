import { useContext } from 'react';
import { AuthContext } from '@familieoya/api-client';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider (shell)');
  return ctx;
}
