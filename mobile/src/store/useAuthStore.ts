import { create } from 'zustand';
import { clearToken, saveToken, TokiUser } from '../api/client';

interface AuthState {
  user: TokiUser | null;
  isLoggedIn: boolean;
  setAuth: (user: TokiUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,

  setAuth: async (user, token) => {
    await saveToken(token);
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    await clearToken();
    set({ user: null, isLoggedIn: false });
  },
}));
