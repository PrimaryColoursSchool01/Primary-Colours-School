import { create } from "zustand";
import { persist } from "zustand";

export const useAuthStore = create(
  persist((set) => ({
    user: null,
    accessToken: null,

    setAuth: (user, accessToken) => set({ user, accessToken }),

    setAccessToken: (accessToken) => set({ accessToken }),

    logout: () => set({ user: null, accessToken: null }),
  })),
  { name: "Auth", partialState: (state) => ({ user: state.user }) },
);
