/**
 * ADMIN MODULE — Free Trial Videos (YogaT20 only)
 * Thin wrapper — reuses the exact same Clinical Video CMS screen/logic,
 * just scoped to the isolated trial video pool via isFreeTrialMode.
 */

import ClinicalVideoCMS from "./ClinicalVideoCMS";

const FreeTrialVideos = () => <ClinicalVideoCMS isFreeTrialMode />;

export default FreeTrialVideos;
