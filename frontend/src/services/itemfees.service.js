import api from "./api";

export const getAllItems = async () => {
  const { data } = await api.get("/item");
  return data;
};

export const getItemById = async (id) => {
  const { data } = await api.get(`/item/${id}`);
  return data;
};

export const createItem = async (payload) => {
  const { data } = await api.post("/item", payload);
  return data;
};

export const updateItem = async (id, payload) => {
  const { data } = await api.put(`/item/${id}`, payload);
  return data;
};

export const deleteItem = async (id) => {
  const { data } = await api.delete(`/item/${id}`);
  return data;
};

export const restockItem = async (id, quantity) => {
  const { data } = await api.post(`/item/${id}/restock`, { quantity });
  return data;
};

export const setItemStock = async (id, stockQuantity) => {
  const { data } = await api.put(`/item/${id}`, { stockQuantity });
  return data;
};

export const getSections = async () => {
  const { data } = await api.get("/sections");
  return data;
};

export const getClasses = async () => {
  const { data } = await api.get("/classes");
  return data;
};
