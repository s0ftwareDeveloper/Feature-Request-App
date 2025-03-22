import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies and NextAuth sessions
})

// No need to manually add auth token headers
// NextAuth.js session cookie will automatically be included with requests
// because of withCredentials: true

export default api

