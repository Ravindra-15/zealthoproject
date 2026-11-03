/**
 * useConsultationFee — this visitor's appointment fee in USD (set by the
 * admin per country). `ready` turns true once it's loaded, so pages can
 * wait instead of flashing the wrong price first.
 */

import { useEffect, useState } from "react";
import { fetchConsultationFee, FALLBACK_FEE } from "../services/consultationFeeService";

export const useConsultationFee = () => {
  const [fee, setFee] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchConsultationFee().then((value) => {
      if (mounted) setFee(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { fee: fee ?? FALLBACK_FEE, ready: fee !== null };
};
