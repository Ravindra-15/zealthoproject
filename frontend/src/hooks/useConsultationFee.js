/**
 * useConsultationFee — this visitor's appointment fee (set by the admin per
 * country, in that country's own currency). `ready` turns true once it's
 * loaded, so pages can wait instead of flashing the wrong price first.
 *
 *   fee      → USD amount PayPal charges
 *   label    → what the patient sees, e.g. "₹999" (round figures have no decimals)
 *   usdLabel → the USD charge, e.g. "$11.98"
 */

import { useEffect, useState } from "react";
import { fetchConsultationFee, FALLBACK } from "../services/consultationFeeService";
import { decimalsForCurrency } from "../utils/currency";

// "₹999" for a round figure, "$12.50" otherwise — never crashes on an odd code
export const formatFee = (amount, currency = "USD") => {
  const n = Number.isFinite(amount) ? amount : 0;
  const decimals = Number.isInteger(n) ? 0 : decimalsForCurrency(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimalsForCurrency(currency),
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
};

export const useConsultationFee = () => {
  const [value, setValue] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchConsultationFee().then((v) => {
      if (mounted) setValue(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const v = value || FALLBACK;
  return {
    fee: v.fee,
    localFee: v.localFee,
    currency: v.currency,
    label: formatFee(v.localFee, v.currency),
    usdLabel: formatFee(v.fee, "USD"),
    ready: value !== null,
  };
};
