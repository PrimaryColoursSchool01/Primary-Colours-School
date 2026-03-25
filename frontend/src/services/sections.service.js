import api from "./api";

// ─── Get All Sections ────────────────────────────────────────────────────────

export const getAllSections = async () => {
  const { data } = await api.get("/sections");
  return data; // Returns { message, sections: [...] }
};

// ─── Create Section ──────────────────────────────────────────────────────────

export const createSection = async (payload) => {
  const { data } = await api.post("/sections", payload);
  return data; // Returns { message, section }
};

// ─── Get Section By ID ───────────────────────────────────────────────────────

export const getSectionById = async (id) => {
  const { data } = await api.get(`/sections/${id}`);
  return data; // Returns { message, section }
};

// ─── Update Section ──────────────────────────────────────────────────────────

export const updateSection = async (id, payload) => {
  const { data } = await api.put(`/sections/${id}`, payload);
  return data; // Returns { message, section }
};

// ─── Delete Section ──────────────────────────────────────────────────────────

export const deleteSection = async (id) => {
  const { data } = await api.delete(`/sections/${id}`);
  return data; // Returns { message, section }
};
