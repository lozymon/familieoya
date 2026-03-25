import { createContext } from 'react';
import type { UserProfile, LoginDto } from './types';

export interface AuthContextValue {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  activeHouseholdId: string | null;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  setActiveHouseholdId: (id: string | null) => void;
}

// Module Federation bundles each lib separately, so createContext() would run
// multiple times — creating different context objects per bundle. Storing the
// instance on window ensures all MFEs share the exact same object.
const CONTEXT_KEY = '__familieoya_auth_ctx__';

declare global {
  interface Window {
    [CONTEXT_KEY]?: ReturnType<typeof createContext<AuthContextValue | null>>;
  }
}

function getAuthContext() {
  if (typeof window === 'undefined') {
    return createContext<AuthContextValue | null>(null);
  }
  if (!window[CONTEXT_KEY]) {
    window[CONTEXT_KEY] = createContext<AuthContextValue | null>(null);
  }
  return window[CONTEXT_KEY]!;
}

export const AuthContext = getAuthContext();
