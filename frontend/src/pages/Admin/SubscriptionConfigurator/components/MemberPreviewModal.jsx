/**
 * ============================================
 * ADMIN MODULE — Preview as Member
 * ============================================
 * Shows the "Select your Tenure" screen a new member gets, with the chosen
 * plan outlined. Preview only: the buttons do nothing.
 * ============================================
 */

import ModalShell from "../../PortalUsers/components/ModalShell";
import MemberPlanCard from "./MemberPlanCard";
import { getMemberPlanView } from "./memberPlanView";

const MemberPreviewModal = ({ plan, plans, programLabel, onClose }) => {
  const view = getMemberPlanView(plans);

  let notice = "";
  if (plan && plan.isActive === false) {
    notice = "This plan is inactive, so members can't see it.";
  } else if (plan && !view.isOnTenure(plan)) {
    notice = `New members can't see this plan because it's under ${view.minMonthsForNew} months. Members extending a plan can.`;
  }

  return (
    <ModalShell
      isOpen={!!plan}
      onClose={onClose}
      labelledBy="member-preview-title"
      size="lg"
    >
      {plan && (
        <>
          <div className="px-6 pt-5 pb-3 pr-14 border-b border-gray-100">
            <p
              id="member-preview-title"
              className="text-sm font-semibold text-gray-800"
            >
              Preview as Member
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {view.isOnTenure(plan)
                ? `"${plan.planName}" is outlined. Buttons don't work in this preview.`
                : "Buttons don't work in this preview."}
            </p>
          </div>

          {notice && (
            <p className="mx-6 mt-4 text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              {notice}
            </p>
          )}

          {/* What the member sees */}
          <div className="px-6 sm:px-8 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Select your Tenure
              </h2>
              <p className="text-sm text-gray-500">
                Hey{" "}
                <span className="text-orange-500 font-semibold">
                  {programLabel}
                </span>
                , Select your Program Duration
              </p>
            </div>

            {view.tenurePlans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                New subscribers start with a plan of 3 months or more — none is
                available right now.
              </p>
            ) : (
              <div
                className={`grid gap-4 ${
                  view.tenurePlans.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {view.tenurePlans.map((p) => (
                  <MemberPlanCard
                    key={p._id}
                    plan={p}
                    isBestseller={view.isBestseller(p)}
                    isSelected={p._id === plan._id}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-gray-100 text-[11px] text-gray-500">
            <span>
              Landing page:{" "}
              {view.isOnLanding(plan)
                ? "shown"
                : plan.isVisibleOnLanding
                ? "not shown (only the first 2 appear)"
                : "not shown"}
            </span>
            <span>Members see prices in their own currency.</span>
          </div>
        </>
      )}
    </ModalShell>
  );
};

export default MemberPreviewModal;
