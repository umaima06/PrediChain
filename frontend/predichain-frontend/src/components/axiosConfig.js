import axios from "axios";
import { auth } from "../firebase";

const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Attach fresh Firebase token to every request
axiosInstance.interceptors.request.use(async (config) => {
  // Wait for user to exist
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve();
    });
  });
  
  const currentUser = auth.currentUser;
  if (currentUser) {
    // Force refresh to get valid token
    const token = await currentUser.getIdToken(true);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosInstance;
