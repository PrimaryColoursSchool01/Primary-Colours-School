import axios from "axios";
import { useAuthStore } from "@/store/store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise = null;

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh-token", {}, { withCredentials: true })
            .then(({ data }) => {
              useAuthStore.getState().setAccessToken(data.accessToken);
              return data.accessToken;
            })
            .catch((err) => {
              console.error("Refresh request failed:", {
                status: err.response?.status,
                data: err.response?.data,
                message: err.message,
              });
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh flow failed, logging out:", {
          status: refreshError.response?.status,
          data: refreshError.response?.data,
          message: refreshError.message,
        });

        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
