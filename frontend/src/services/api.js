import axios from "axios";
import { useAuthStore } from "@/store/store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Track refresh promise to prevent multiple simultaneous refreshes
let refreshPromise = null;

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not retry login requests
    if (originalRequest.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // Handle 401: attempt to refresh access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If refresh is already in progress, wait for it
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh-token", {}, { withCredentials: true })
            .then(({ data }) => {
              useAuthStore.getState().setAccessToken(data.accessToken);
              return data.accessToken;
            })
            .catch((err) => {
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        // Wait for refresh to complete (either new or existing promise)
        const newToken = await refreshPromise;

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Log the exact reason for refresh failure
        console.error("Refresh failed:", {
          status: refreshError.response?.status,
          data: refreshError.response?.data,
          message: refreshError.message,
          url: refreshError.config?.url,
        });

        // Clear auth state and redirect to login
        useAuthStore.getState().logout();
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
