/**
 * ADMIN MODULE — Body Profile Tab
 *
 * The patient's body profile, laid out with the points of the program
 * picked in the sidebar (each program's points are set in
 * Configuration → Body Profile). Answers outside that list show under
 * "Other answers". Empty state if no data yet.
 */

import BodyProfileView from "../../../../components/common/BodyProfileView";
import { useSelectedProgram } from "../../../../context/SelectedProgramContext";

const BodyProfileTab = ({ bodyProfile }) => {
  const { selectedProgramId, selectedProgram } = useSelectedProgram();

  if (!bodyProfile) return <BodyProfileView bodyProfile={null} />;

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
      "
    >
      <p className="text-[11px] text-gray-400 mb-5">
        Shown with {selectedProgram?.label || "this program"}'s body profile points.
      </p>
      <BodyProfileView bodyProfile={bodyProfile} programId={selectedProgramId} />
    </div>
  );
};

export default BodyProfileTab;
