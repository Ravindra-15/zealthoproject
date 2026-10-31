/**
 * ============================================
 * ADMIN MODULE — Member Plan View
 * ============================================
 * Works out how members see plans, so the admin previews match the real pages:
 *  - Backend: active plans, lowest displayOrder first (newest first on a tie).
 *    The first fixed plan is the Bestseller.
 *  - Select Tenure page: new subscribers only get plans of 3+ months.
 *  - Landing page: the first 2 active plans marked "show on landing".
 *  - Weekly slider: new subscribers start at 12 weeks or the plan's minimum,
 *    whichever is higher.
 *
 * If those rules change in customer.program.controller.js or
 * customer.programPlan.controller.js, change them here too.
 * ============================================
 */

import { convertAndFormat } from "../../../../utils/currency";

const MIN_NEW_MONTHS = 3;
const MIN_NEW_WEEKS = 12;

// 💵 Same formatter members get. Admin prices are always USD.
export const formatMemberPrice = (amountUSD) =>
  convertAndFormat(Number(amountUSD) || 0, "USD");

// 📏 Plan length in months (0 = unknown → never hidden)
const planMonths = (plan) =>
  Number(plan?.durationMonths) || parseInt(plan?.planName, 10) || 0;

// 🏷️ Same as the backend when no duration is typed: "12 Months" → 12
export const parseMonthsFromPlanName = (planName) => {
  const match = String(planName || "").match(/(\d+)\s*month/i);
  return match ? parseInt(match[1], 10) : null;
};

const byMemberOrder = (a, b) =>
  a.displayOrder - b.displayOrder ||
  new Date(b.createdAt) - new Date(a.createdAt);

// ============================================
// 🟧 FIXED PLANS
// ============================================
export const getMemberPlanView = (plans) => {
  const activePlans = plans
    .filter(
      (p) => p.isActive !== false && (p.pricingType || "fixed") === "fixed"
    )
    .sort(byMemberOrder);

  const tenurePlans = activePlans.filter(
    (p) => !planMonths(p) || planMonths(p) >= MIN_NEW_MONTHS
  );
  const landingPlans = activePlans
    .filter((p) => p.isVisibleOnLanding)
    .slice(0, 2);

  return {
    tenurePlans,
    landingPlans,
    minMonthsForNew: MIN_NEW_MONTHS,
    isBestseller: (plan) =>
      plan._id === activePlans[0]?._id || plan._id === tenurePlans[0]?._id,
    isOnTenure: (plan) => tenurePlans.some((p) => p._id === plan._id),
    isOnLanding: (plan) => landingPlans.some((p) => p._id === plan._id),
  };
};

// ============================================
// 🟦 WEEKLY PLAN
// ============================================
// null until the numbers make a valid slider
export const getWeeklyMemberView = ({
  baseRate,
  minWeeks,
  maxWeeks,
  breakpoints,
}) => {
  const base = Number(baseRate);
  const planMin = Number(minWeeks);
  const max = Number(maxWeeks);
  if (!(base > 0) || !(planMin >= 1) || !(max >= planMin)) return null;

  const steps = breakpoints
    .map((bp) => ({
      minWeeks: Number(bp.minWeeks),
      discountPercent: Number(bp.discountPercent),
      badgeText: bp.badgeText.trim(),
    }))
    .filter(
      (bp) =>
        bp.minWeeks >= 1 && bp.discountPercent >= 0 && bp.discountPercent <= 100
    )
    .sort((a, b) => a.minWeeks - b.minWeeks);

  const min = Math.min(max, Math.max(MIN_NEW_WEEKS, planMin));

  const priceFor = (weeks) => {
    let discount = 0;
    steps.forEach((bp) => {
      if (weeks >= bp.minWeeks && bp.discountPercent > discount) {
        discount = bp.discountPercent;
      }
    });
    return Math.round(base * weeks * (1 - discount / 100));
  };

  const markers = steps
    .filter((bp) => bp.minWeeks >= min && bp.minWeeks <= max)
    .map((bp) => ({
      ...bp,
      left: max > min ? ((bp.minWeeks - min) / (max - min)) * 100 : 0,
    }));

  return { base, min, max, markers, priceFor };
};
