import api from "./api";

export const getDashboardData = async () => {
  const { data } = await api.get("/dashboard");
  return data;
};

export const getRecentResponses = async (page = 1, limit = 10) => {
  const { data } = await api.get("/dashboard/recent", {
    params: { page, limit },
  });
  return data;
};
