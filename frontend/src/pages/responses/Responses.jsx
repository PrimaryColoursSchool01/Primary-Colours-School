import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Eye, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getAllPaymentRecords, acceptPaymentItems, rejectPaymentRecord } from "@/services/payment-record.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function Responses() {
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [session, setSession] = useState("all");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPaymentRecords = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (status !== "all") params.status = status;
      if (session !== "all") params.session = session;

      const response = await getAllPaymentRecords(params);
      setPaymentRecords(response.paymentRecords);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      toast.error("Failed to load payment records");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentRecords();
  }, [page, status, session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPaymentRecords();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setSelectedItemIds([]);
    setDetailModalOpen(true);
  };

  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItemIds((prev) => [...prev, itemId]);
    } else {
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleAccept = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to accept");
      return;
    }
    try {
      await acceptPaymentItems(selectedRecord._id, selectedItemIds);
      toast.success("Items accepted successfully");
      setDetailModalOpen(false);
      fetchPaymentRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept items");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectPaymentRecord(selectedRecord._id, rejectionReason);
      toast.success("Payment record rejected");
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      fetchPaymentRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject");
    }
  };

  const openRejectModal = () => {
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      accepted: "bg-green-100 text-green-800 border border-green-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
      partially_accepted: "bg-orange-100 text-orange-800 border border-orange-200", // ← NEW
    };
    return configs[status] || configs.pending;
  };

  const getItemStatusBadge = (status) => {
    const configs = {
      pending: "bg-slate-100 text-slate-700",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Payment Responses</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Review and accept parent payment submissions</p>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              placeholder="Search by child or payer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full text-xs sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[120px] text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_accepted">Partial</SelectItem> {/* ← NEW */}
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={session}
              onValueChange={(v) => {
                setSession(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[120px] text-xs sm:text-sm">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="2024/2025">2024/2025</SelectItem>
                <SelectItem value="2025/2026">2025/2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Mobile / Tablet Card List (hidden on lg+) ── */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">Loading payment records...</div>
          ) : paymentRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">No payment records found</div>
          ) : (
            paymentRecords.map((record) => (
              <div
                key={record._id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{record.nameOfChild}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">{record.nameOfPayerOrCompany}</p>
                  </div>
                  <Badge className={`${getStatusBadge(record.status)} shrink-0 text-[10px] sm:text-xs px-2 py-0.5 h-auto`}>
                    {record.status === "partially_accepted" ? "Partial" : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Class</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">{record.classId?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Session</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{record.session}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Amount</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      ₦{record.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Submitted</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(record)}
                  className="w-full text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm h-9"
                >
                  <Eye size={14} className="mr-2" />
                  View Details
                </Button>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table (lg+) ── */}
        <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Child Name</TableHead>
                <TableHead className="text-xs">Class</TableHead>
                <TableHead className="text-xs">Payer</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Session</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Submitted</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    Loading payment records...
                  </TableCell>
                </TableRow>
              ) : paymentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    No payment records found
                  </TableCell>
                </TableRow>
              ) : (
                paymentRecords.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium text-sm">{record.nameOfChild}</TableCell>
                    <TableCell className="text-sm">{record.classId?.name || "N/A"}</TableCell>
                    <TableCell className="text-sm">{record.nameOfPayerOrCompany}</TableCell>
                    <TableCell className="text-sm">₦{record.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{record.session}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(record.status)}>
                        {record.status === "partially_accepted"
                          ? "Partial"
                          : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(record)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Showing {paymentRecords.length} of {total} records
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm h-9"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm h-9"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════
          Detail Modal
      ════════════════════════════ */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:w-[85vw] md:w-[70vw] max-w-3xl max-h-[90dvh] overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:p-6">
          <DialogHeader className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b">
            <DialogTitle className="text-sm sm:text-base md:text-lg font-semibold">Payment Record Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Review and accept items from this payment submission</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3 sm:space-y-4">
              {/* Payment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {[
                  { label: "Child Name", value: selectedRecord.nameOfChild },
                  { label: "Class", value: selectedRecord.classId?.name || "N/A" },
                  { label: "Payer", value: selectedRecord.nameOfPayerOrCompany },
                  { label: "Session", value: selectedRecord.session },
                  { label: "Payment Date", value: new Date(selectedRecord.dateOfPayment).toLocaleDateString() },
                  { label: "Payment Mode", value: selectedRecord.modeOfPayment.replace(/-/g, " ") },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs sm:text-sm font-medium capitalize truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 pb-2 border-b">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Items</h4>
                  {selectedRecord.items?.some((i) => i.status === "pending") && (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = selectedRecord.items.filter((i) => i.status === "pending").map((i) => i._id);
                        setSelectedItemIds(ids);
                      }}
                      className="text-[10px] sm:text-xs text-[#136dec] hover:text-[#0f55c0] font-medium whitespace-nowrap"
                    >
                      Select All Pending
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-1">
                  {selectedRecord.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {/* Checkbox */}
                      <div className="w-4 h-4 shrink-0">
                        {item.status === "pending" && (
                          <Checkbox
                            checked={selectedItemIds.includes(item._id)}
                            onCheckedChange={(checked) => handleItemSelect(item._id, checked)}
                            className="w-4 h-4"
                          />
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.itemId?.name || "Item"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>

                      {/* Amount + Badge */}
                      <div className="shrink-0 flex flex-col items-end gap-1 min-w-[70px] sm:min-w-[80px]">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          ₦{item.amountAtPayment.toLocaleString()}
                        </p>
                        <Badge className={`${getItemStatusBadge(item.status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 h-auto`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Total Amount</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  ₦{selectedRecord.totalAmount.toLocaleString()}
                </p>
              </div>

              {/* Status Info */}
              {selectedRecord.status !== "pending" && (
                <div className="p-2.5 sm:p-3 md:p-4 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                  <p className="text-[10px] sm:text-xs text-slate-500">Overall Status</p>
                  <Badge className={`${getStatusBadge(selectedRecord.status)} text-xs px-2 py-0.5 h-auto`}>
                    {selectedRecord.status === "partially_accepted"
                      ? "Partial"
                      : selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                  </Badge>
                  {selectedRecord.status === "accepted" && selectedRecord.acceptedBy && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-2 break-words">
                      Accepted by {selectedRecord.acceptedBy.fullName} on {new Date(selectedRecord.acceptedAt).toLocaleDateString()}
                    </p>
                  )}
                  {selectedRecord.status === "rejected" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] sm:text-xs text-slate-500 break-words">
                        Rejected by {selectedRecord.rejectedBy?.fullName} on {new Date(selectedRecord.rejectedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 break-words">
                        <span className="font-medium">Reason:</span> {selectedRecord.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 flex-col sm:flex-row gap-2">
            {selectedRecord?.items?.some((item) => item.status === "pending") ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="w-full sm:w-auto order-3 sm:order-1 text-xs sm:text-sm h-9"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={openRejectModal}
                  className="w-full sm:w-auto order-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs sm:text-sm h-9"
                  title="Reject all pending items in this payment. Already accepted items will remain approved."
                >
                  <XCircle size={14} className="mr-1.5 shrink-0" />
                  <span className="truncate">Reject Pending</span>
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={selectedItemIds.length === 0}
                  className="w-full sm:w-auto order-1 sm:order-3 bg-[#136dec] hover:bg-[#0f55c0] text-white text-xs sm:text-sm h-9"
                >
                  <CheckCircle size={14} className="mr-1.5 shrink-0" />
                  <span className="truncate">Accept Selected ({selectedItemIds.length})</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDetailModalOpen(false)} className="w-full sm:w-auto text-xs sm:text-sm h-9">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════
          Reject Modal
      ════════════════════════════ */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="w-[95vw] sm:w-[85vw] max-w-md max-h-[90dvh] overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:p-6">
          <DialogHeader className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b">
            <DialogTitle className="text-sm sm:text-base font-semibold">Reject Pending Items</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Provide a reason for rejecting the remaining pending items</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 mt-2">
            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="text-yellow-600 mt-0.5 shrink-0" size={16} />
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
                This will reject ALL pending items in this payment record. Already accepted items will remain approved. This action cannot
                be undone.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Payment amount does not match..."
                className="w-full min-h-[80px] sm:min-h-[100px] p-2.5 sm:p-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1 text-xs sm:text-sm h-9"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} className="w-full sm:w-auto order-1 sm:order-2 text-xs sm:text-sm h-9">
              Reject Pending Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
