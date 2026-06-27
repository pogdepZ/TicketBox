"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  getUsersAdmin,
  updateUserStatusAdmin,
  updateUserRoleAdmin,
  getFriendlyErrorMessage,
  getProfile,
} from "@/lib/api";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const openConfirm = (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      ...config,
    });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Get profile of currently logged-in admin
  useEffect(() => {
    async function fetchAdminProfile() {
      try {
        const profile = await getProfile();
        if (profile?.id) {
          setCurrentUserId(profile.id);
        }
      } catch (err) {
        console.error("Failed to load admin profile", err);
      }
    }
    fetchAdminProfile();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setMeta((prev: any) => ({ ...prev, page: 1 })); // reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsersAdmin(meta.page, meta.limit, searchDebounced);
      setUsersList(res.items || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: any) {
      console.error(err);
      setError(
        getFriendlyErrorMessage(err) || "Không thể tải danh sách người dùng.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [meta.page, searchDebounced]);

  async function handleToggleStatus(userId: string, currentStatus: string) {
    if (userId === currentUserId) return; // Prevent self-locking in frontend
    
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const confirmMsg =
      newStatus === "BLOCKED"
        ? "Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể đăng nhập hoặc đặt vé."
        : "Bạn có chắc chắn muốn mở khóa tài khoản này?";

    openConfirm({
      title: newStatus === "BLOCKED" ? "Khóa tài khoản" : "Mở khóa tài khoản",
      message: confirmMsg,
      variant: newStatus === "BLOCKED" ? "danger" : "info",
      confirmText: newStatus === "BLOCKED" ? "Khóa tài khoản" : "Kích hoạt",
      onConfirm: async () => {
        closeConfirm();
        if (actionLoadingId) return;
        setActionLoadingId(userId);
        try {
          await updateUserStatusAdmin(userId, newStatus);
          
          window.dispatchEvent(
            new CustomEvent("ticketbox-toast", {
              detail: {
                title:
                  newStatus === "BLOCKED"
                    ? "Đã khóa tài khoản"
                    : "Đã kích hoạt tài khoản",
                message: "Cập nhật trạng thái người dùng thành công.",
                type: "success",
              },
            }),
          );
          
          loadUsers();
        } catch (err: any) {
          window.dispatchEvent(
            new CustomEvent("ticketbox-toast", {
              detail: {
                title: "Thao tác thất bại",
                message: getFriendlyErrorMessage(err),
                type: "error",
              },
            }),
          );
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  async function handleToggleRole(userId: string, currentRoles: any[]) {
    if (userId === currentUserId) return; // Prevent self-revoking admin role in frontend

    const isCurrentlyAdmin = currentRoles?.some(
      (r: any) => r.role?.name === "admin",
    );
    const newRole = isCurrentlyAdmin ? "user" : "admin";
    const confirmMsg =
      newRole === "admin"
        ? "Bạn có chắc chắn muốn gán quyền Quản trị viên (Admin) cho người dùng này? Họ sẽ có toàn quyền chỉnh sửa sự kiện và dữ liệu."
        : "Bạn có chắc chắn muốn gỡ quyền Quản trị viên (Admin) của người dùng này?";

    openConfirm({
      title: newRole === "admin" ? "Cấp quyền Admin" : "Gỡ quyền Admin",
      message: confirmMsg,
      variant: newRole === "admin" ? "warning" : "danger",
      confirmText: newRole === "admin" ? "Cấp quyền" : "Gỡ quyền",
      onConfirm: async () => {
        closeConfirm();
        if (actionLoadingId) return;
        setActionLoadingId(userId);
        try {
          await updateUserRoleAdmin(userId, newRole);

          window.dispatchEvent(
            new CustomEvent("ticketbox-toast", {
              detail: {
                title: "Cập nhật quyền thành công",
                message: `Người dùng đã được đổi vai trò sang: ${newRole.toUpperCase()}.`,
                type: "success",
              },
            }),
          );

          loadUsers();
        } catch (err: any) {
          window.dispatchEvent(
            new CustomEvent("ticketbox-toast", {
              detail: {
                title: "Thao tác thất bại",
                message: getFriendlyErrorMessage(err),
                type: "error",
              },
            }),
          );
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Users className="size-9 text-primary" />
              Quản lý người dùng
            </h1>
            <p className="text-muted-foreground">Xem danh sách, phân quyền và quản lý trạng thái kích hoạt tài khoản của người dùng.</p>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
            <Search className="size-5" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo email, họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        {error && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive font-semibold">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3.5 whitespace-nowrap">Họ và tên</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Email / Số điện thoại</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Vai trò</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Ngày tham gia</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && usersList.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-48 rounded bg-muted" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-muted" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-muted" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-muted" /></td>
                      <td className="px-4 py-4 text-center"><div className="mx-auto h-8 w-[230px] rounded-full bg-muted" /></td>
                    </tr>
                  ))
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  usersList.map((user) => {
                    const isAdmin = user.roles?.some(
                      (r: any) => r.role?.name === "admin",
                    );
                    const dateJoined = new Date(
                      user.createdAt,
                    ).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                    const isSelf = user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-muted/15 transition-all"
                      >
                        <td className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">
                          {user.fullName}
                          {isSelf && (
                            <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Bạn
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="font-medium text-foreground">{user.email}</p>
                          {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                              isAdmin
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            }`}
                          >
                            {isAdmin ? (
                              <ShieldAlert className="size-3.5" />
                            ) : (
                              <Shield className="size-3.5" />
                            )}
                            {isAdmin ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground font-medium whitespace-nowrap">
                          {dateJoined}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                user.status === "ACTIVE"
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {user.status === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center gap-3">
                            {/* Toggle Admin Role Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleRole(user.id, user.roles)}
                              disabled={actionLoadingId === user.id || isSelf}
                              className={`flex items-center justify-center gap-1.5 rounded-full border w-[110px] py-1.5 text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap ${
                                isSelf
                                  ? "border-slate-800 bg-slate-900/10 text-slate-500 opacity-40 cursor-not-allowed pointer-events-none"
                                  : isAdmin
                                  ? "border-blue-500/30 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10"
                                  : "border-rose-500/30 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10"
                              }`}
                              title={
                                isSelf
                                  ? "Bạn không thể tự gỡ quyền Admin của chính mình"
                                  : ""
                              }
                            >
                              {isAdmin ? "Gỡ Admin" : "Lên Admin"}
                            </button>

                            {/* Toggle Lock Account Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              disabled={actionLoadingId === user.id || isSelf}
                              className={`flex items-center justify-center gap-1.5 rounded-full border w-[110px] py-1.5 text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap ${
                                isSelf
                                  ? "border-slate-800 bg-slate-900/10 text-slate-500 opacity-40 cursor-not-allowed pointer-events-none"
                                  : user.status === "ACTIVE"
                                  ? "border-slate-500/30 bg-slate-500/5 text-slate-500 hover:bg-slate-500/10"
                                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10"
                              }`}
                              title={
                                isSelf
                                  ? "Bạn không thể tự khóa tài khoản của chính mình"
                                  : ""
                              }
                            >
                              {user.status === "ACTIVE" ? (
                                <>
                                  <Ban className="size-3.5" />
                                  Khóa
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="size-3.5" />
                                  Mở khóa
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/10 px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Hiển thị trang <strong className="text-foreground">{meta.page}</strong> trên <strong className="text-foreground">{meta.totalPages}</strong> ({meta.total} người dùng)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMeta((prev: any) => ({
                      ...prev,
                      page: Math.max(prev.page - 1, 1),
                    }))
                  }
                  disabled={meta.page <= 1 || loading}
                  className="inline-flex items-center justify-center size-8 rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMeta((prev: any) => ({
                      ...prev,
                      page: Math.min(prev.page + 1, meta.totalPages),
                    }))
                  }
                  disabled={meta.page >= meta.totalPages || loading}
                  className="inline-flex items-center justify-center size-8 rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />
    </AdminLayout>
  );
}
