import { STATUS } from "./enquiryUi";

// Coloured status chip for an enquiry ticket
const EnquiryStatusPill = ({ status, className = "" }) => {
  const s = STATUS[status] || STATUS.new;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  );
};

export default EnquiryStatusPill;
