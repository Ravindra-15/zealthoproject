/**
 * ============================================
 * useCurrency — live price-conversion hook
 * ============================================
 * Fetches the cached FX rates + the logged-in customer's resolved
 * currency once, then exposes a `convert(amountUSD)` helper that every
 * pricing component (plan cards, tenure selector, checkout, appointment
 * fee) can call to show a correctly-converted, correctly-formatted price
 * for that customer — without each component fetching anything itself.
 *
 * Always resolves to USD if anything's missing/still loading, so a price
 * never renders blank.
 * ============================================
 */

import { useEffect, useState } from "react";
import { fetchExchangeRates, fetchMyCurrency } from "../services/currencyService";
import { convertAndFormat, formatCurrency } from "../utils/currency";

export const useCurrency = () => {
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchExchangeRates(), fetchMyCurrency()])
      .then(([ratesData, myCurrency]) => {
        if (!mounted) return;
        setRates(ratesData?.rates || {});
        setCurrency(myCurrency || "USD");
      })
      .catch(() => {
        // Already error-proofed inside the service calls — this is just
        // an extra safety net so the hook itself never throws.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 💱 Convert + format a USD amount for the current customer in one call.
  const convert = (amountUSD) => convertAndFormat(amountUSD, currency, rates);

  return { currency, rates, ready, convert, formatCurrency };
};
