import api from "./api";

export const getStaffDashboard = async () => {
  const { data } = await api.get("/staff/dashboard");
  return data;
};

export const getStaffAssignments = async (params = {}) => {
  const { data } = await api.get("/staff/assignments", { params });
  return data;
};

export const markCollected = async (transactionId, note = "") => {
  const { data } = await api.post(`/staff/transactions/${transactionId}/collect`, {
    note: note.trim(),
  });
  return data;
};

export const getStaffHistory = async (params = {}) => {
  const { data } = await api.get("/staff/history", { params });
  return data;
};

export const getStaffClasses = async () => {
  const { data } = await api.get("/staff/classes");
  return data;
};
