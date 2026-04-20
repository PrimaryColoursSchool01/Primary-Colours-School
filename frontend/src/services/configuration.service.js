import api from "./api";

export const getConfigurationHealth = async () => {
  const { data } = await api.get("/configuration-health");
  return data;
};
