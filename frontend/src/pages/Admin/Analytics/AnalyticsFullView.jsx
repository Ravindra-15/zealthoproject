/**
 * ADMIN MODULE — Full view of a dashboard chart (opened by "View more")
 * Routes: /admin/analytics/users, /admin/analytics/revenue
 * Access: Super Admin only. Filters arrive in the URL from the dashboard.
 */

import { useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import UsersGrowthPanel from "../Dashboard/analytics/UsersGrowthPanel";
import RevenuePanel from "../Dashboard/analytics/RevenuePanel";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";

const AnalyticsFullView = () => {
  const { kind } = useParams();
  const [search] = useSearchParams();
  const { selectedProgramId } = useSelectedProgram();
  const initial = useMemo(() => Object.fromEntries(search.entries()), [search]);

  if (kind === "users") {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Total Users" subtitle="Users growth with filters, zoom and export" />
        <UsersGrowthPanel expanded initial={initial} />
      </div>
    );
  }
  if (kind === "revenue") {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Revenue Analysis" subtitle="Revenue by period, source and program" />
        <RevenuePanel expanded initial={initial} defaultProgramId={selectedProgramId} />
      </div>
    );
  }
  return <Navigate to="/admin/dashboard" replace />;
};

export default AnalyticsFullView;
