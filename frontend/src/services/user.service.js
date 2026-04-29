import api from "./api";

export const getAllUsers = async (params) => {
  const { data } = await api.get("/users", { params });
  return data;
};

export const getUserById = async (id) => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const createUser = async (payload) => {
  const { data } = await api.post("/users", payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
};

export const markUserNoLongerWorking = async (id) => {
  const { data } = await api.post(`/users/${id}/no-longer-working`);
  return data;
};

export const suspendUser = async (id) => {
  const { data } = await api.post(`/users/${id}/suspend`);
  return data;
};

export const unsuspendUser = async (id) => {
  const { data } = await api.post(`/users/${id}/unsuspend`);
  return data;
};

export const resetUserPassword = async (id, newPassword) => {
  const { data } = await api.post(`/users/${id}/reset-password`, { newPassword });
  return data;
};
