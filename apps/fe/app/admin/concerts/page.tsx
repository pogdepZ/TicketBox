"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { ConcertTable } from "@/components/concert-table";
import {
  getConcerts,
  cancelConcert,
  publishConcert,
  getFriendlyErrorMessage,
} from "@/lib/api";
import Link from "next/link";
import { Plus, Search, RefreshCw, Calendar } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";

export default function AdminConcertsPage() {
  const [concertsList, setConcertsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConcertId, setConfirmConcertId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 10;

  async function loadConcerts(searchKeyword = keyword, targetPage = 1, currentStatus = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params: any = { keyword: searchKeyword, page: targetPage, limit };
      if (currentStatus !== "all") {
        params.status = currentStatus;
      }
      const res = await getConcerts(params);
      setConcertsList(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setPage(res.meta?.page || targetPage);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Không thể tải danh sách sự kiện.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConcerts(keyword, 1, statusFilter);
  }, [statusFilter]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      loadConcerts(keyword, 1, statusFilter);
    }
  }

  async function handleToggleActive(id: string, currentStatus: string) {
    const isActivating = currentStatus !== "PUBLISHED";
    if (isActivating) {
      try {
        await publishConcert(id);
        window.dispatchEvent(
          new CustomEvent("ticketbox-toast", {
            detail: {
              title: "Kích hoạt sự kiện thành công",
              message: "Sự kiện đã được xuất bản và hiển thị công khai!",
              type: "success",
            },
          }),
        );
        loadConcerts(keyword, page);
      } catch (err: any) {
        window.dispatchEvent(
          new CustomEvent("ticketbox-toast", {
            detail: {
              title: "Kích hoạt thất bại",
              message: getFriendlyErrorMessage(err),
              type: "error",
            },
          }),
        );
      }
    } else {
      setConfirmConcertId(id);
      setConfirmOpen(true);
    }
  }

  async function confirmCancel() {
    if (!confirmConcertId) return;
    setConfirmOpen(false);
    try {
      await cancelConcert(confirmConcertId);
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Ngưng kích hoạt thành công",
            message: "Sự kiện đã được chuyển sang trạng thái Đã hủy.",
            type: "success",
          },
        }),
      );
      loadConcerts(keyword, page);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Ngưng kích hoạt thất bại",
            message: getFriendlyErrorMessage(err),
            type: "error",
          },
        }),
      );
    } finally {
      setConfirmConcertId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Calendar className="size-9 text-primary" />
              Quản lý sự kiện
            </h1>
            <p className="text-muted-foreground mt-1">
              Tất cả các sự kiện đang có trong hệ thống
            </p>
          </div>
          <Link
            href="/admin/create-concert"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
          >
            <Plus className="size-5" />
            Tạo sự kiện
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm sự kiện (Nhấn Enter để tìm)..."
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/15 text-foreground text-sm"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full rounded-full border border-border bg-card px-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/15 text-foreground text-sm cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
                backgroundSize: '16px',
                paddingRight: '40px'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đang mở bán</option>
              <option value="cancelled">Đã hủy</option>
              <option value="completed">Đã kết thúc</option>
            </select>
          </div>

          <button
            onClick={() => loadConcerts(keyword, 1, statusFilter)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 h-12 font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Tìm kiếm
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive font-semibold">
            {error}
          </div>
        )}

        {loading && concertsList.length === 0 ? (
          <div className="space-y-4">
            <div className="h-12 rounded-3xl border border-border bg-card animate-pulse" />
            <div className="h-64 rounded-3xl border border-border bg-card animate-pulse" />
          </div>
        ) : concertsList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            Không tìm thấy sự kiện nào phù hợp.
          </div>
        ) : (
          <div className="space-y-6">
            <ConcertTable
              concerts={concertsList}
              onToggleActive={handleToggleActive}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/80 pt-6">
                <span className="text-sm text-muted-foreground">
                  Trang <strong className="text-foreground">{page}</strong> / <strong className="text-foreground">{totalPages}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => loadConcerts(keyword, page - 1, statusFilter)}
                    className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer"
                  >
                    Trước
                  </button>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => loadConcerts(keyword, page + 1, statusFilter)}
                    className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Ngưng kích hoạt sự kiện"
        message="Bạn có chắc chắn muốn ngưng kích hoạt (hủy) sự kiện này? Thao tác này không thể hoàn tác và sự kiện sẽ không còn hiển thị đối với khách hàng nữa."
        confirmText="Ngưng kích hoạt"
        cancelText="Hủy"
        onConfirm={confirmCancel}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmConcertId(null);
        }}
        variant="danger"
      />
    </AdminLayout>
  );
}
