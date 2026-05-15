import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchDoctorDashboard } from "../services/doctorDashboardService";

const useDoctorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const result = await fetchDoctorDashboard();
      setData(result);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { data, loading, refetch: load };
};

export default useDoctorDashboard;