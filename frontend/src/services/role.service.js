import api from "./api";

export const getAllRoles = async () => {
  const { data } = await api.get("/roles");
  return data;
};

export const createRole = async (payload) => {
  const { data } = await api.post("/roles", payload);
  return data;
};

export const updateRole = async (id, payload) => {
  const { data } = await api.put(`/roles/${id}`, payload);
  return data;
};

export const deleteRole = async (id) => {
  const { data } = await api.delete(`/roles/${id}`);
  return data;
};

export const getRoleById = async (id) => {
  const { data } = await api.get(`/roles/${id}`);
  return data;
};

export const getRoleDependencies = async (id) => {
  const { data } = await api.get(`/roles/${id}/dependencies`);
  return data;
};

export const getAllItems = async () => {
  const { data } = await api.get("/item");
  return data;
};

export const getAllSections = async () => {
  const { data } = await api.get("/sections");
  return data;
};

export const getAllClasses = async () => {
  const { data } = await api.get("/classes");
  return data;
};
