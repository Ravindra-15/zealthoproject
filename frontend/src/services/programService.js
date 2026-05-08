import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

// ============================================
// 🔐 GET AUTH TOKEN
// ============================================
const getToken = () => {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("doctorToken") ||
    sessionStorage.getItem("doctorToken")
  );
};

// ============================================
// 📦 CREATE SUBSCRIPTION
// ============================================
export const subscribeToProgram = async (
  payload
) => {
  const token = getToken();

  const response = await axios.post(
    `${API_BASE}/customer/programs/subscribe`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
    }
  );

  return response.data;
};

// ============================================
// 📋 GET MY SUBSCRIPTIONS
// ============================================
export const getMySubscriptions =
  async () => {
    const token = getToken();

    const response = await axios.get(
      `${API_BASE}/customer/programs/my-subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  };

// ============================================
// 🎯 GET PROGRAM STATUS
// ============================================
export const getProgramStatus =
  async (programId) => {
    const token = getToken();

    const response = await axios.get(
      `${API_BASE}/customer/programs/${programId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  };

// ============================================
// ❌ CANCEL SUBSCRIPTION
// ============================================
export const cancelSubscription =
  async (subscriptionId) => {
    const token = getToken();

    const response = await axios.patch(
      `${API_BASE}/customer/programs/${subscriptionId}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  };