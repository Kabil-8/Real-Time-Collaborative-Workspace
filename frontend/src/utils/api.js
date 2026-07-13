import axios from "axios";

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || "http://localhost:4000") + "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // The API returns { error: { message } }, while older UI code reads
    // response.data.message. Expose the canonical message in both places.
    const apiMessage = err.response?.data?.error?.message;
    if (apiMessage && err.response?.data) err.response.data.message = apiMessage;
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("token");
      const p = window.location.pathname;
      if (p !== "/login" && p !== "/register") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
