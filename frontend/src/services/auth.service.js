import api from "./api";
import { useAuthStore } from "@/store/store";

export const login = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout backend error:", error);
  } finally {
    useAuthStore.getState().logout();
  }
};

export const refreshToken = async () => {
  const { data } = await api.post("/auth/refresh-token");
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post("/auth/reset-password", {
    token,
    newPassword,
  });
  return data;
};
