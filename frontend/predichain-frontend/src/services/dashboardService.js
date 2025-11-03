import axios from "axios";

const API_URL = "http://localhost:8000/dashboard-data";

export const getDashboardData = async (formData) => {
  try {
    const response = await axios.post(API_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  } catch (err) {
    console.error("Dashboard fetch error", err);
    throw err;
  }
};