/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { getAllUsers } from "@/services/user.service";
import { getAllRoles } from "@/services/role.service";
import { useAuthStore } from "@/store/store";
import UsersTable from "@/components/users/UsersTable";
import UserModal from "@/components/users/UserModal";
import ResetPasswordModal from "@/components/users/ResetPasswordModal";
import DeleteConfirmModal from "@/components/users/DeleteConfirmModal";
import SuspendConfirmModal from "@/components/users/SuspendConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Users() {
  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("all");
  const [status, setStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState("add");

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  // Fetch ALL users once (no search/pagination params)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getAllUsers({ limit: 1000 });
      // Filter out current user
      const filteredUsers = response.users.filter((user) => user._id !== currentUser?.id);
      setAllUsers(filteredUsers);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await getAllRoles();
      setRoles(response.roles);
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [currentUser?.id]);

  // Client-side filtering (INSTANT search!)
  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = user.fullName.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);

      // User type filter
      const matchesUserType = userType === "all" || user.userType === userType;

      // Status filter
      const matchesStatus = status === "all" || user.status === status;

      return matchesSearch && matchesUserType && matchesStatus;
    });
  }, [allUsers, search, userType, status]);

  // Pagination for filtered results
  const totalPages = Math.ceil(filteredUsers.length / limit);
  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, userType, status]);

  const handleAddUser = () => {
    setModalMode("add");
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setResetModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleSuspendUser = (user) => {
    setSelectedUser(user);
    setSuspendModalOpen(true);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setResetModalOpen(false);
    setDeleteModalOpen(false);
    setSuspendModalOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage staff and admin accounts</p>
          </div>
          <Button
            onClick={handleAddUser}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-8 sm:h-9 md:h-10 text-xs sm:text-sm px-3 sm:px-4"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Add User</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <UsersTable
          users={paginatedUsers}
          loading={loading}
          onEdit={handleEditUser}
          onResetPassword={handleResetPassword}
          onDelete={handleDeleteUser}
          onSuspend={handleSuspendUser}
        />

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Showing {paginatedUsers.length} of {filteredUsers.length} users
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="border-slate-200 dark:border-slate-800 flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="border-slate-200 dark:border-slate-800 flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        user={selectedUser}
        roles={roles}
        onSuccess={handleModalSuccess}
      />

      <ResetPasswordModal open={resetModalOpen} onOpenChange={setResetModalOpen} user={selectedUser} onSuccess={handleModalSuccess} />

      <DeleteConfirmModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} user={selectedUser} onSuccess={handleModalSuccess} />

      <SuspendConfirmModal open={suspendModalOpen} onOpenChange={setSuspendModalOpen} user={selectedUser} onSuccess={handleModalSuccess} />
    </div>
  );
}
