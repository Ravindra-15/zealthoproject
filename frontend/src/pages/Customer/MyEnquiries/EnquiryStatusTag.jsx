/**
 * CUSTOMER — My Enquiries: status tag (Open / Waiting for you / Resolved / Closed)
 */

import { STATUS } from "./enquiryUi";

export default function EnquiryStatusTag({ status }) {
  const s = STATUS[status] || STATUS.open;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}
