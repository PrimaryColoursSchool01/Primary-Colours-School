import { MoreHorizontal, Pencil, Key, Power, UserX, Mail, User, BadgeCheck, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";

export default function UsersTable({ users, loading, onEdit, onResetPassword, onMarkNoLongerWorking, onSuspend }) {
  if (loading) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="animate-pulse space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 dark:bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-8 sm:p-12 text-center">
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">No users found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table (Hidden on Mobile) */}
      <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-800">
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">Name</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">Email</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">User Type</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">Roles</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">Status</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 text-sm">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id} className="border-slate-200 dark:border-slate-800">
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{user.fullName}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      user.userType === "admin"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800 text-xs"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 text-xs"
                    }
                  >
                    {user.userType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.slice(0, 2).map((role) => (
                      <Badge
                        key={role._id}
                        variant="outline"
                        className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      >
                        {role.name}
                      </Badge>
                    ))}
                    {user.roles?.length > 2 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      >
                        +{user.roles.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      user.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800 text-xs"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800 text-xs"
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 h-8 w-8 p-0"
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <DropdownMenuItem
                        onClick={() => onEdit(user)}
                        className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                      >
                        <Pencil size={16} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onResetPassword(user)}
                        className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                      >
                        <Key size={16} className="mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      {user.status !== "inactive" && (
                        <DropdownMenuItem
                          onClick={() => onSuspend(user)}
                          className="text-orange-600 dark:text-orange-400 focus:bg-slate-100 dark:focus:bg-slate-800"
                        >
                          <Power size={16} className="mr-2" />
                          {user.status === "suspended" ? "Unsuspend" : "Suspend"}
                        </DropdownMenuItem>
                      )}
                      {user.status !== "inactive" && (
                        <DropdownMenuItem
                          onClick={() => onMarkNoLongerWorking(user)}
                          className="text-red-600 dark:text-red-400 focus:bg-slate-100 dark:focus:bg-slate-800"
                        >
                          <UserX size={16} className="mr-2" />
                          No Longer Working
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (Hidden on Desktop) */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <div key={user._id} className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 p-4 space-y-3">
            {/* Header with Action Menu */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">{user.fullName}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0 h-8 w-8 p-0"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <DropdownMenuItem
                    onClick={() => onEdit(user)}
                    className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                  >
                    <Pencil size={16} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onResetPassword(user)}
                    className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                  >
                    <Key size={16} className="mr-2" />
                    Reset Password
                  </DropdownMenuItem>
                  {user.status !== "inactive" && (
                    <DropdownMenuItem
                      onClick={() => onSuspend(user)}
                      className="text-orange-600 dark:text-orange-400 focus:bg-slate-100 dark:focus:bg-slate-800"
                    >
                      <Power size={16} className="mr-2" />
                      {user.status === "suspended" ? "Unsuspend" : "Suspend"}
                    </DropdownMenuItem>
                  )}
                  {user.status !== "inactive" && (
                    <DropdownMenuItem
                      onClick={() => onMarkNoLongerWorking(user)}
                      className="text-red-600 dark:text-red-400 focus:bg-slate-100 dark:focus:bg-slate-800"
                    >
                      <UserX size={16} className="mr-2" />
                      No Longer Working
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                  <Badge
                    variant="outline"
                    className={
                      user.userType === "admin"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800 text-xs"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 text-xs"
                    }
                  >
                    {user.userType}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      user.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800 text-xs"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800 text-xs"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Roles */}
            {user.roles && user.roles.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Roles</p>
                <div className="flex flex-wrap gap-1">
                  {user.roles.slice(0, 3).map((role) => (
                    <Badge
                      key={role._id}
                      variant="outline"
                      className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    >
                      {role.name}
                    </Badge>
                  ))}
                  {user.roles.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    >
                      +{user.roles.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Created {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
