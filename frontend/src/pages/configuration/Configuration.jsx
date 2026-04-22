// src/pages/admin/Configuration.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2, Tag, Users } from "lucide-react";
import { getConfigurationHealth } from "@/services/configuration.service";
import { toast } from "sonner";

export default function Configuration() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getConfigurationHealth();
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch configuration health:", err);
        setError(err.message || "Failed to load configuration data");
        toast.error("Could not load configuration health");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#136dec] mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading configuration health...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to load data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, noRoleItems, noStaffItems } = data || {};
  const hasIssues = (noRoleItems?.length || 0) + (noStaffItems?.length || 0) > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Configuration Health</h1>
        <p className="text-sm text-slate-500 mt-1">Fix items and roles to ensure smooth staff assignment for future payments.</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Items without role</p>
                <p className="text-lg font-bold text-slate-900">{summary.noRoleItemsCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Items with no staff</p>
                <p className="text-lg font-bold text-slate-900">{summary.noStaffItemsCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total stuck payments</p>
                <p className="text-lg font-bold text-slate-900">{summary.totalAffectedTransactions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasIssues && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">All systems healthy</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No items are stuck due to missing roles or staff. Your configuration is ready for smooth fulfillment.
          </p>
        </div>
      )}

      {/* Items Without Role Section */}
      {noRoleItems?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">Items Without Assigned Role</h3>
            </div>
            <span className="text-xs text-slate-500">
              {noRoleItems.length} item{noRoleItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Helper note */}
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
            💡 These items aren't linked to any role yet.{" "}
            <button onClick={() => navigate("/items")} className="underline ml-1 font-medium hover:text-amber-900">
              Assign roles to items
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {noRoleItems.map((item) => (
              <div key={item.itemId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.affectedTransactions} payment{item.affectedTransactions !== 1 ? "s" : ""} stuck
                  </p>
                </div>
                {/* Dual links: let admin choose workflow */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/items?id=${item.itemId}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors bg-transparent border-none cursor-pointer p-0"
                    title="Edit this item to assign it to a role"
                  >
                    Fix in Items <ArrowRight size={12} />
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => navigate(`/roles`)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors bg-transparent border-none cursor-pointer p-0"
                    title="Create or edit a role to include this item"
                  >
                    Fix in Roles <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items With No Staff Section */}
      {noStaffItems?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-slate-900">Items With Roles But No Active Staff</h3>
            </div>
            <span className="text-xs text-slate-500">
              {noStaffItems.length} item{noStaffItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* NEW: Helper note pointing to Users page */}
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 text-xs text-orange-700">
            💡 These items have roles assigned, but those roles have no active staff.{" "}
            <button onClick={() => navigate("/users")} className="underline ml-1 font-medium hover:text-orange-900">
              Add staff to roles
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {noStaffItems.map((item) => (
              <div key={item.itemId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.affectedTransactions} payment{item.affectedTransactions !== 1 ? "s" : ""} stuck
                  </p>
                </div>
                {/* CHANGED: Link to Users page to add staff to roles */}
                <button
                  onClick={() => navigate(`/users?role=${item.itemId}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors bg-transparent border-none cursor-pointer p-0"
                  title="Add staff to roles that handle this item"
                >
                  Fix in Users <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-slate-400 text-center pt-4">
        Fixing these items ensures future payments auto-route to staff. Historical transactions may still need manual assignment.
      </div>
    </div>
  );
}
