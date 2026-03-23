import api from "./api";

export const login = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};

export const refreshToken = async () => {
  const { data } = await api.post("/auth/refresh-token");
  return data;
};

export const changePassword = async (payload) => {
  const { data } = await api.patch("/auth/change-password", payload);
  return data;
};
