import { create } from 'zustand';
import { clearToken, saveToken, TokiUser } from '../api/client';

interface AuthState {
  user: TokiUser | null;
  isLoggedIn: boolean;
  avatarUri: string | null;
  setAuth: (user: TokiUser, token: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<TokiUser, 'displayName'> & { avatarUri: string }>) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  avatarUri: null,

  setAuth: async (user, token) => {
    await saveToken(token);
    set({ user, isLoggedIn: true });
  },

  updateProfile: (patch) => set(s => ({
    user: s.user ? { ...s.user, ...(patch.displayName ? { displayName: patch.displayName } : {}) } : s.user,
    avatarUri: patch.avatarUri ?? s.avatarUri,
  })),

  logout: async () => {
    await clearToken();
    set({ user: null, isLoggedIn: false, avatarUri: null });
  },
}));
