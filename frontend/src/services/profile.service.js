import api from "./api";

export const getProfile = async () => {
  const { data } = await api.get("/profile");
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.put("/profile", payload);
  return data;
};

export const logoutAllSessions = async () => {
  const { data } = await api.post("/profile/logout-all");
  return data;
};
