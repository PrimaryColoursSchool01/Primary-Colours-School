import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),

      logout: () => {
        // Clear Zustand state
        set({ user: null, accessToken: null });
        // Explicitly remove persisted storage
        localStorage.removeItem("findora-auth");
      },
    }),
    {
      name: "findora-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);
