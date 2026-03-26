import api from "./api";

// ─── Get All Classes ─────────────────────────────────────────────────────────

export const getAllClasses = async () => {
  const { data } = await api.get("/classes");
  return data; // Returns { message, classes: [...] }
};

// ─── Create Class ────────────────────────────────────────────────────────────

export const createClass = async (payload) => {
  const { data } = await api.post("/classes", payload);
  return data; // Returns { message, class }
};

// ─── Get Class By ID ─────────────────────────────────────────────────────────

export const getClassById = async (id) => {
  const { data } = await api.get(`/classes/${id}`);
  return data; // Returns { message, class }
};

// ─── Update Class ────────────────────────────────────────────────────────────

export const updateClass = async (id, payload) => {
  const { data } = await api.put(`/classes/${id}`, payload);
  return data; // Returns { message, class }
};

// ─── Delete Class ────────────────────────────────────────────────────────────

export const deleteClass = async (id) => {
  const { data } = await api.delete(`/classes/${id}`);
  return data; // Returns { message, class }
};

// ─── Get All Sections  ─────────────────────────────────────────

export const getAllSections = async () => {
  const { data } = await api.get("/sections");
  return data; // Returns { message, sections: [...] }
};
