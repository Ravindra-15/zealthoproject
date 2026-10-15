// Shared helpers for PayPal checkout error handling.

// Turns a failed payment API call into a clear, user-facing message.
export const getPaymentErrorMessage = (
  err,
  fallback = "Something went wrong with your payment. Please try again."
) => {
  if (!err?.response) {
    return err?.code === "ECONNABORTED"
      ? "The request timed out. Please check your connection and try again."
      : "Network error — please check your internet connection and try again.";
  }
  return err.response.data?.message || fallback;
};

// True when we genuinely don't know the outcome yet (network drop, timeout,
// server busy) — retrying is always safe: the backend never charges or
// books twice for the same PayPal order.
export const isRetryablePaymentError = (err) => {
  if (!err?.response) return true;
  const { status } = err.response;
  const code = err.response.data?.code;
  return (
    status >= 500 ||
    code === "PAYMENT_PROCESSING" ||
    code === "PAYPAL_UNREACHABLE" ||
    code === "PAYMENT_RETRYABLE"
  );
};

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
