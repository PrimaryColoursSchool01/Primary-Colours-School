import api from "./api";

export const createPaymentRecord = async (payload) => {
  const { data } = await api.post("/payment-records", payload);
  return data;
};

export const getAllPaymentRecords = async (params = {}) => {
  const { data } = await api.get("/payment-records", { params });
  return data;
};

export const getPaymentRecordById = async (id) => {
  const { data } = await api.get(`/payment-records/${id}`);
  return data;
};

export const acceptPaymentItems = async (id, acceptedItemIds, amountReceived) => {
  const { data } = await api.put(`/payment-records/${id}`, {
    action: "accept",
    acceptedItemIds,
    amountReceived,
  });
  return data;
};

export const rejectPaymentRecord = async (id, rejectionReason, amountReceived) => {
  const { data } = await api.put(`/payment-records/${id}`, {
    action: "reject",
    rejectionReason,
    amountReceived,
  });
  return data;
};

export const updateAmountReceived = async (id, amountReceived) => {
  const { data } = await api.put(`/payment-records/${id}`, {
    action: "update-amount",
    amountReceived,
  });
  return data;
};
