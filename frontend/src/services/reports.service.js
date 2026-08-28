import api from "./api";

export const getPaymentSummary = async (params = {}) => {
  const { data } = await api.get("/reports/payment-summary", { params });
  return data;
};

export const getStudentRegister = async (params = {}) => {
  const { data } = await api.get("/reports/student-register", { params });
  return data;
};
