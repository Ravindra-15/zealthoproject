/**
 * ============================================
 * RESCHEDULE POLICY — shared constants + helper
 * ============================================
 * Client spec: a customer may reschedule an appointment a maximum of 5
 * times, and only freely if done 48+ hours before the scheduled slot.
 * Inside that window, rescheduling is blocked — the customer can still
 * attend as scheduled, or cancel (existing no-refund cancellation rule
 * applies either way; Zealtho has no cash-refund mechanism for customer
 * cancellations, so this isn't a refund rule, just a "can this still be
 * moved for free" cutoff).
 *
 * The 48-hour cutoff applies ONLY to customer-initiated reschedules — a
 * doctor rescheduling (e.g. for an emergency) is not time-restricted,
 * though the shared 5-reschedule cap still applies either way.
 * ============================================
 */

const MAX_RESCHEDULE_COUNT = 5;
const RESCHEDULE_CUTOFF_HOURS = 48;
const RESCHEDULE_CUTOFF_MS = RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000;

// true if `scheduledAt` is less than 48 hours away from right now.
const isWithinRescheduleCutoff = (scheduledAt) =>
  new Date(scheduledAt).getTime() - Date.now() < RESCHEDULE_CUTOFF_MS;

module.exports = {
  MAX_RESCHEDULE_COUNT,
  RESCHEDULE_CUTOFF_HOURS,
  RESCHEDULE_CUTOFF_MS,
  isWithinRescheduleCutoff,
};
