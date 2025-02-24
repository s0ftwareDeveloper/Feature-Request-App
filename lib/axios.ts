import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

