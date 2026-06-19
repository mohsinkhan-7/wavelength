import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as api from '@/api/backend';
import type { User } from '@/types';

const TOKEN_KEY = 'wavelength.token';
const USER_KEY = 'wavelength.user';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean; // true while restoring session on launch
  error: string | null;
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (payload: { displayName?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: true,
  error: null,

  // Restore a saved session on app launch.
  restore: async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (token) {
        api.setAuthToken(token);
        const user = userJson ? (JSON.parse(userJson) as User) : null;
        set({ token, user });
        // Refresh profile in the background (also validates the token).
        try {
          const { user: fresh } = await api.getMe();
          set({ user: fresh });
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
        } catch {
          // token invalid/expired — sign out
          await get().logout();
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const { token, user } = await api.login(email, password);
    api.setAuthToken(token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    set({ token, user });
  },

  register: async (email, password, displayName) => {
    set({ error: null });
    const { token, user } = await api.register(email, password, displayName);
    api.setAuthToken(token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    set({ token, user });
  },

  logout: async () => {
    api.setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    set({ token: null, user: null });
  },

  setUser: (user) => {
    set({ user });
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
  },

  updateProfile: async (payload) => {
    const { user } = await api.updateProfile(payload);
    get().setUser(user);
  },
}));
