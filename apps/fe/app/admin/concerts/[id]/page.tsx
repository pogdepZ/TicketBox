"use client";

import { useEffect, useState, use } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  getConcertById,
  getLocalTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  getFriendlyErrorMessage,
  uploadArtistBioPdf,
  getAiBioStatus,
  updateConcertBio,
  importGuestList,
  updateConcert,
} from "@/lib/api";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  Clock,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/confirm-modal";
import { DatePicker, TimePicker, DateTimePicker } from "@/components/date-time-picker";

interface AdminConcertDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AdminConcertDetailPage({
  params,
}: AdminConcertDetailPageProps) {
  const { id: concertId } = use(params);
  const [concert, setConcert] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTicketTypeId, setDeleteTicketTypeId] = useState<string | null>(
    null,
  );

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "details" | "tickets" | "bio" | "guests"
  >("details");

  // Concert Details Form State
  const [editName, setEditName] = useState("");
  const [editArtistName, setEditArtistName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventTime, setEditEventTime] = useState("");
  const [editVenueName, setEditVenueName] = useState("");
  const [editVenueAddress, setEditVenueAddress] = useState("");
  const [editPosterUrl, setEditPosterUrl] = useState("");
  const [editSeatMapSvg, setEditSeatMapSvg] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Ticket Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [maxPerUser, setMaxPerUser] = useState("4");
  const [saleStartAt, setSaleStartAt] = useState("");
  const [saleEndAt, setSaleEndAt] = useState("");

  // Bio Form State
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [bioStatus, setBioStatus] = useState<
    "EMPTY" | "PROCESSING" | "DONE" | "FAILED"
  >("EMPTY");
  const [bioText, setBioText] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState("");

  // Guest CSV Form State
  const [guestFile, setGuestFile] = useState<File | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  const isPublished = concert?.status === 'PUBLISHED';
  const isCancelledOrCompleted = concert?.status === 'CANCELLED' || concert?.status === 'COMPLETED';
  const isBasicInfoReadOnly = isPublished || isCancelledOrCompleted;

  async function refreshTicketTypes() {
    try {
      const freshConcert = await getConcertById(concertId);
      if (freshConcert.seatZones && freshConcert.seatZones.length > 0) {
        const dbTicketTypes = freshConcert.seatZones.flatMap((zone: any) => {
          return (
            zone.ticketTypes?.map((t: any) => ({
              id: t.id,
              concertId: t.concertId,
              seatZoneId: zone.id,
              name: t.name,
              price: Number(t.price),
              totalQuantity: t.totalQuantity,
              remaining: t.remaining,
              maxPerUser: t.maxPerUser,
              status: t.status,
              saleStartAt: t.saleStartAt,
              saleEndAt: t.saleEndAt,
            })) || []
          );
        });
        if (dbTicketTypes.length > 0) {
          setTicketTypes(dbTicketTypes);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to refresh ticket types from backend:", e);
    }
    setTicketTypes(getLocalTicketTypes(concertId));
  }

  useEffect(() => {
    async function loadData() {
      try {
        const concertData = await getConcertById(concertId);
        setConcert(concertData);

        // Populate edit details form
        setEditName(concertData.title || "");
        setEditArtistName(concertData.artist || "");
        setEditDescription(concertData.description || "");
        setEditVenueName(concertData.venue || "");
        setEditVenueAddress(concertData.city || "");
        setEditPosterUrl(concertData.image || "");
        setEditSeatMapSvg(concertData.seatMapSvgUrl || "");

        if (concertData.date) {
          const d = new Date(concertData.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setEditEventDate(`${yyyy}-${mm}-${dd}`);

          const hh = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          setEditEventTime(`${hh}:${min}`);
        }

        // Load ticket types (combining DB and LocalStorage fallback)
        if (concertData.seatZones && concertData.seatZones.length > 0) {
          const dbTicketTypes = concertData.seatZones.flatMap((zone: any) => {
            return (
              zone.ticketTypes?.map((t: any) => ({
                id: t.id,
                concertId: t.concertId,
                seatZoneId: zone.id,
                name: t.name,
                price: Number(t.price),
                totalQuantity: t.totalQuantity,
                remaining: t.remaining,
                maxPerUser: t.maxPerUser,
                status: t.status,
                saleStartAt: t.saleStartAt,
                saleEndAt: t.saleEndAt,
              })) || []
            );
          });
          if (dbTicketTypes.length > 0) {
            setTicketTypes(dbTicketTypes);
          } else {
            setTicketTypes(getLocalTicketTypes(concertId));
          }
        } else {
          setTicketTypes(getLocalTicketTypes(concertId));
        }

        // Load Bio initial state
        const bioData = await getAiBioStatus(concertId);
        setBioStatus(bioData.status);
        setBioText(bioData.bio || "");
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [concertId]);

  // Polling for AI Bio processing status
  useEffect(() => {
    let intervalId: any;

    if (bioStatus === "PROCESSING") {
      intervalId = setInterval(async () => {
        try {
          const res = await getAiBioStatus(concertId);
          if (res.status === "DONE") {
            setBioStatus("DONE");
            setBioText(res.bio || "");
            window.dispatchEvent(
              new CustomEvent("ticketbox-toast", {
                detail: {
                  title: "Phân tích hoàn tất",
                  message: "Sinh tiểu sử nghệ sĩ bằng AI thành công!",
                  type: "success",
                },
              }),
            );
            clearInterval(intervalId);
          } else if (res.status === "FAILED") {
            setBioStatus("FAILED");
            setBioError("Sinh tiểu sử nghệ sĩ bằng AI thất bại.");
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error("Error polling bio status:", err);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [bioStatus, concertId]);

  function validateDetails() {
    if (!editName.trim()) return "Vui lòng nhập tên sự kiện.";
    if (!editVenueName.trim()) return "Vui lòng nhập tên địa điểm.";
    if (!editVenueAddress.trim()) return "Vui lòng nhập địa chỉ địa điểm.";
    if (!editEventDate || !editEventTime)
      return "Vui lòng nhập đầy đủ ngày và giờ diễn ra.";

    const parsedDate = new Date(`${editEventDate}T${editEventTime}`);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Thời gian diễn ra sự kiện không hợp lệ.";
    }

    return "";
  }

  async function handleDetailsSave(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");

    if (isCancelledOrCompleted) {
      setEditError("Không thể chỉnh sửa sự kiện đã hủy hoặc đã hoàn thành.");
      return;
    }

    if (!isPublished) {
      const validationMsg = validateDetails();
      if (validationMsg) {
        setEditError(validationMsg);
        return;
      }
    }

    setEditLoading(true);
    try {
      let payload: any;
      if (isPublished) {
        payload = {
          description: editDescription.trim() || undefined,
          posterUrl: editPosterUrl.trim() || undefined,
          seatMapSvg: editSeatMapSvg.trim() || undefined,
        };
      } else {
        const parsedDate = new Date(`${editEventDate}T${editEventTime}`);
        payload = {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          artistName: editArtistName.trim() || undefined,
          venueName: editVenueName.trim(),
          venueAddress: editVenueAddress.trim(),
          eventDate: parsedDate.toISOString(),
          posterUrl: editPosterUrl.trim() || undefined,
          seatMapSvg: editSeatMapSvg.trim() || undefined,
        };
      }

      await updateConcert(concertId, payload);

      // Reload updated concert display info
      const updatedConcert = await getConcertById(concertId);
      setConcert(updatedConcert);

      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Cập nhật thành công",
            message: "Thông tin sự kiện đã được cập nhật thành công.",
            type: "success",
          },
        }),
      );
    } catch (err: any) {
      setEditError(getFriendlyErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice("");
    setTotalQuantity("");
    setMaxPerUser("4");
    setSaleStartAt("");
    setSaleEndAt("");
  }

  function validate() {
    if (!name.trim()) return "Vui lòng nhập tên hạng vé.";
    if (Number(price) <= 0) return "Giá vé phải lớn hơn 0.";
    if (Number(totalQuantity) <= 0) return "Số lượng vé phải lớn hơn 0.";
    if (Number(maxPerUser) < 1) return "Số lượng mua tối đa phải ít nhất là 1.";
    if (
      saleStartAt &&
      saleEndAt &&
      new Date(saleStartAt) >= new Date(saleEndAt)
    ) {
      return "Thời gian bắt đầu bán phải trước thời gian kết thúc.";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationMsg = validate();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        totalQuantity: Number(totalQuantity),
        maxPerUser: Number(maxPerUser),
        saleStartAt: saleStartAt || null,
        saleEndAt: saleEndAt || null,
      };

      if (editingId) {
        await updateTicketType(concertId, editingId, payload);
        window.dispatchEvent(
          new CustomEvent("ticketbox-toast", {
            detail: {
              title: "Cập nhật thành công",
              message: `Hạng vé "${name}" đã được cập nhật thành công.`,
              type: "success",
            },
          }),
        );
      } else {
        await createTicketType(concertId, payload);
        window.dispatchEvent(
          new CustomEvent("ticketbox-toast", {
            detail: {
              title: "Tạo hạng vé thành công",
              message: `Hạng vé "${name}" đã được khởi tạo thành công.`,
              type: "success",
            },
          }),
        );
      }

      // Refresh list
      await refreshTicketTypes();
      resetForm();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  }

  function handleEdit(t: any) {
    setEditingId(t.id);
    setName(t.name);
    setPrice(t.price.toString());
    setTotalQuantity(t.totalQuantity.toString());
    setMaxPerUser(t.maxPerUser.toString());
    setSaleStartAt(t.saleStartAt ? t.saleStartAt.substring(0, 16) : "");
    setSaleEndAt(t.saleEndAt ? t.saleEndAt.substring(0, 16) : "");
  }

  function handleDelete(ticketTypeId: string) {
    setDeleteTicketTypeId(ticketTypeId);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteTicketType() {
    if (!deleteTicketTypeId) return;
    setDeleteConfirmOpen(false);
    setError("");
    try {
      await deleteTicketType(concertId, deleteTicketTypeId);
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Xóa thành công",
            message: "Hạng vé đã được xóa thành công khỏi sự kiện.",
            type: "success",
          },
        }),
      );
      await refreshTicketTypes();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setDeleteTicketTypeId(null);
    }
  }

  // AI Bio Handlers
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file && file.type === "application/pdf") {
      setBioFile(file);
      setBioError("");
    } else {
      setBioFile(null);
      setBioError("Vui lòng chỉ tải lên file định dạng PDF.");
    }
  }

  async function handleBioUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bioFile) return;

    setBioLoading(true);
    setBioError("");
    try {
      await uploadArtistBioPdf(concertId, bioFile);
      setBioStatus("PROCESSING");
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Tải lên thành công",
            message: "Đang tải lên PDF và phân tích tạo bio bằng AI...",
            type: "success",
          },
        }),
      );
      setBioFile(null);
    } catch (err) {
      setBioError(getFriendlyErrorMessage(err));
    } finally {
      setBioLoading(false);
    }
  }

  async function handleBioSave(e: React.FormEvent) {
    e.preventDefault();
    setBioLoading(true);
    setBioError("");
    try {
      await updateConcertBio(concertId, bioText);
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Cập nhật thành công",
            message: "Tiểu sử nghệ sĩ đã được cập nhật thành công!",
            type: "success",
          },
        }),
      );
    } catch (err) {
      setBioError(getFriendlyErrorMessage(err));
    } finally {
      setBioLoading(false);
    }
  }

  // Guest Import Handlers
  function handleGuestFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (
        file.name.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setGuestFile(file);
        setGuestError("");
        setImportResult(null);
      } else {
        setGuestFile(null);
        setGuestError("Vui lòng chỉ tải lên file định dạng CSV.");
      }
    }
  }

  async function handleGuestUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestFile) return;

    setGuestLoading(true);
    setGuestError("");
    setImportResult(null);

    try {
      const res = await importGuestList(concertId, guestFile);
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Nhập danh sách thành công",
            message: "Nhập danh sách khách mời thành công!",
            type: "success",
          },
        }),
      );
      setImportResult(res);
      setGuestFile(null);
    } catch (err) {
      setGuestError(getFriendlyErrorMessage(err));
    } finally {
      setGuestLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Link
          href="/admin/concerts"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quản lý sự kiện
        </Link>

        {concert && (
          <div className="p-6 bg-card border border-border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-foreground">
                  {concert.title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  concert.status === 'PUBLISHED' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : concert.status === 'DRAFT'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : concert.status === 'CANCELLED'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                }`}>
                  {concert.status === 'PUBLISHED' 
                    ? 'Đã xuất bản' 
                    : concert.status === 'DRAFT' 
                    ? 'Bản nháp' 
                    : concert.status === 'CANCELLED'
                    ? 'Đã hủy'
                    : 'Đã hoàn thành'}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                {concert.artist} · {concert.venue}, {concert.city}
              </p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === "details"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Thông tin chi tiết
            {activeTab === "details" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === "tickets"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hạng vé sự kiện
            {activeTab === "tickets" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("bio")}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === "bio"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4" />
              Tiểu sử nghệ sĩ AI
            </span>
            {activeTab === "bio" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("guests")}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === "guests"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              Khách mời (CSV)
            </span>
            {activeTab === "guests" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {activeTab === "details" && concert && (
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
            <h2 className="mb-2 text-xl font-black text-foreground">
              Chỉnh sửa thông tin sự kiện
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Cập nhật các thông tin cơ bản, thời gian và địa điểm của đêm nhạc.
            </p>

            <form onSubmit={handleDetailsSave} className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-black text-foreground border-b border-border/50 pb-2">
                  Thông tin cơ bản
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tên sự kiện <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isBasicInfoReadOnly}
                      placeholder="Ví dụ: Đêm Nhạc Trịnh Công Sơn, Live Concert..."
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nghệ sĩ biểu diễn
                      </label>
                      <input
                        type="text"
                        disabled={isBasicInfoReadOnly}
                        placeholder="Ví dụ: Hà Anh Tuấn, Mỹ Tâm..."
                        value={editArtistName}
                        onChange={(e) => setEditArtistName(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Đường dẫn Poster sự kiện (URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/poster.jpg"
                        value={editPosterUrl}
                        onChange={(e) => setEditPosterUrl(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Mô tả sự kiện
                    </label>
                    <textarea
                      placeholder="Nhập thông tin giới thiệu chi tiết về đêm nhạc..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-base font-black text-foreground border-b border-border/50 pb-2">
                  Thời gian & Địa điểm
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ngày diễn ra <span className="text-destructive">*</span>
                      </label>
                      <DatePicker
                        value={editEventDate}
                        onChange={setEditEventDate}
                        required
                        disabled={isBasicInfoReadOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Giờ bắt đầu <span className="text-destructive">*</span>
                      </label>
                      <TimePicker
                        value={editEventTime}
                        onChange={setEditEventTime}
                        required
                        disabled={isBasicInfoReadOnly}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tên địa điểm <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isBasicInfoReadOnly}
                        placeholder="Ví dụ: Sân vận động Quân khu 7, Nhà hát Hòa Bình..."
                        value={editVenueName}
                        onChange={(e) => setEditVenueName(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Địa chỉ chi tiết địa điểm{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isBasicInfoReadOnly}
                        placeholder="Ví dụ: 202 Hoàng Văn Thụ, Phường 9, Phú Nhuận..."
                        value={editVenueAddress}
                        onChange={(e) => setEditVenueAddress(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-2 text-base font-black text-foreground">
                  Sơ đồ chỗ ngồi (Tùy chọn)
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Bạn có thể dán đoạn mã SVG thiết kế sơ đồ ghế vào ô dưới đây
                  (ví dụ: &lt;svg&gt;...&lt;/svg&gt;).
                </p>
                <div>
                  <textarea
                    placeholder="Dán mã SVG sơ đồ ghế tại đây..."
                    value={editSeatMapSvg}
                    onChange={(e) => setEditSeatMapSvg(e.target.value)}
                    rows={3}
                    className="w-full font-mono text-xs rounded-2xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>

              {editError && (
                <div className="flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold">
                  <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="border-t border-border pt-6 flex gap-4 justify-end">
                {!isCancelledOrCompleted && (
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {editLoading && <RefreshCw className="size-4 animate-spin" />}
                    Lưu thay đổi
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-foreground mb-6">
                {editingId ? "Sửa hạng vé" : "Thêm hạng vé mới"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Tên hạng vé
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Vé VIP, Vé GA..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Giá vé (VNĐ)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Mệnh giá"
                      value={
                        price
                          ? Number(price.replace(/\D/g, "")).toLocaleString(
                              "vi-VN",
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setPrice(raw);
                      }}
                      className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Số lượng
                    </label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input
                        type="number"
                        placeholder="Tổng số vé"
                        value={totalQuantity}
                        onChange={(e) => setTotalQuantity(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Max / User
                    </label>
                    <input
                      type="number"
                      placeholder="4"
                      value={maxPerUser}
                      onChange={(e) => setMaxPerUser(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Mở bán lúc
                  </label>
                  <DateTimePicker
                    value={saleStartAt}
                    onChange={setSaleStartAt}
                    placeholder="Chọn thời gian mở bán"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Đóng bán lúc
                  </label>
                  <DateTimePicker
                    value={saleEndAt}
                    onChange={setSaleEndAt}
                    placeholder="Chọn thời gian đóng bán"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive whitespace-pre-line">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                  >
                    {editingId ? "Lưu thay đổi" : "Tạo hạng vé"}
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm overflow-hidden">
              <h2 className="text-xl font-black text-foreground mb-6">
                Các hạng vé hiện có
              </h2>

              {ticketTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có hạng vé nào được cấu hình.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-sm font-bold text-muted-foreground pb-4">
                        <th className="pb-3">Hạng vé</th>
                        <th className="pb-3">Giá vé</th>
                        <th className="pb-3 text-center">Số lượng</th>
                        <th className="pb-3 text-center">Max/User</th>
                        <th className="pb-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ticketTypes.map((t) => (
                        <tr key={t.id} className="text-sm">
                          <td className="py-4 font-bold text-foreground">
                            {t.name}
                          </td>
                          <td className="py-4 text-primary font-bold">
                            {t.price.toLocaleString("vi-VN")}đ
                          </td>
                          <td className="py-4 text-center">
                            {t.totalQuantity}
                          </td>
                          <td className="py-4 text-center">{t.maxPerUser}</td>
                          <td className="py-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleEdit(t)}
                                className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                                aria-label="Sửa hạng vé"
                              >
                                <Edit className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="rounded-full p-2 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                aria-label="Xóa hạng vé"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "bio" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload form */}
            <div className="lg:col-span-1 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-5 text-primary" />
                  Sinh tiểu sử AI
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Tải lên file PDF tiểu sử nghệ sĩ để AI tự động trích xuất và
                  thiết kế tiểu sử nghệ sĩ chuyên nghiệp.
                </p>

                <form onSubmit={handleBioUploadSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-border hover:border-primary/50 transition rounded-3xl p-6 text-center cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="size-8 mx-auto text-muted-foreground group-hover:text-primary transition mb-3" />
                    <p className="text-sm font-bold text-foreground">
                      {bioFile ? bioFile.name : "Chọn file tài liệu PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bioFile
                        ? `${(bioFile.size / 1024 / 1024).toFixed(2)} MB`
                        : "Dung lượng tối đa 10MB"}
                    </p>
                  </div>

                  {bioError && (
                    <div className="flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold whitespace-pre-line">
                      <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
                      <span>{bioError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!bioFile || bioLoading}
                    className="w-full h-11 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {bioLoading ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Bắt đầu sinh Bio
                  </button>
                </form>
              </div>

              {/* Status Indicator */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
                  Trạng thái xử lý AI
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${
                      bioStatus === "DONE"
                        ? "bg-emerald-500"
                        : bioStatus === "PROCESSING"
                          ? "bg-amber-500 animate-pulse"
                          : bioStatus === "FAILED"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                    }`}
                  />
                  <span className="text-sm font-bold text-foreground">
                    {bioStatus === "DONE"
                      ? "Đã hoàn thành"
                      : bioStatus === "PROCESSING"
                        ? "Đang phân tích..."
                        : bioStatus === "FAILED"
                          ? "Lỗi xử lý"
                          : "Trống (Chưa có PDF)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Editor Area */}
            <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col h-full min-h-[420px]">
              <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Nội dung tiểu sử nghệ sĩ
              </h2>

              <form
                onSubmit={handleBioSave}
                className="flex-1 flex flex-col gap-4"
              >
                <textarea
                  placeholder="Tiểu sử nghệ sĩ sẽ hiển thị tại đây sau khi sinh ra từ AI hoặc bạn có thể tự soạn thảo/chỉnh sửa tại đây..."
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  className="flex-grow w-full min-h-[300px] rounded-3xl border border-border bg-background p-5 focus:outline-none focus:ring-4 focus:ring-primary/15 text-foreground leading-relaxed resize-none"
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={bioLoading || !bioText.trim()}
                    className="h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    Lưu & Cập nhật Bio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "guests" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* CSV Import Form */}
            <div className="lg:col-span-1 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Users className="size-5 text-primary" />
                  Nhập danh sách khách mời
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Tải lên file danh sách khách mời định dạng CSV để tự động tạo
                  vé mời trong hệ thống.
                </p>

                <form onSubmit={handleGuestUploadSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-border hover:border-primary/50 transition rounded-3xl p-6 text-center cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleGuestFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="size-8 mx-auto text-muted-foreground group-hover:text-primary transition mb-3" />
                    <p className="text-sm font-bold text-foreground">
                      {guestFile ? guestFile.name : "Chọn file danh sách .csv"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {guestFile
                        ? `${(guestFile.size / 1024).toFixed(2)} KB`
                        : "Yêu cầu định dạng CSV"}
                    </p>
                  </div>

                  {guestError && (
                    <div className="flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold whitespace-pre-line">
                      <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
                      <span>{guestError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!guestFile || guestLoading}
                    className="w-full h-11 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {guestLoading ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Bắt đầu nhập dữ liệu
                  </button>
                </form>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 font-black">
                  Lưu ý định dạng file CSV
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  File CSV phải bao gồm các tiêu đề cột (headers):{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                    email
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                    fullName
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                    phone
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                    ticketType
                  </code>
                  .
                </p>
              </div>
            </div>

            {/* Results & Statistics Area */}
            <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col h-full min-h-[420px]">
              <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Kết quả xử lý tệp khách mời
              </h2>

              {importResult ? (
                <div className="space-y-6 flex-grow flex flex-col justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">
                        Thành công (Imported)
                      </p>
                      <p className="text-3xl font-black text-emerald-500">
                        {importResult.imported ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">
                        Bị trùng lặp (Duplicates)
                      </p>
                      <p className="text-3xl font-black text-amber-500">
                        {importResult.duplicates ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">
                        Lỗi dòng dữ liệu (Errors)
                      </p>
                      <p className="text-3xl font-black text-rose-500">
                        {importResult.errors ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted/30 border border-border p-5 text-sm leading-relaxed text-muted-foreground">
                    <p className="font-bold text-foreground mb-2">
                      Tóm tắt tiến trình:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Hệ thống đã nhận diện và phân tích toàn bộ các dòng dữ
                        liệu trong file CSV.
                      </li>
                      <li>
                        Các khách mời hợp lệ đã được gửi thư mời và phát hành vé
                        điện tử (E-ticket) trực tiếp trong hệ thống.
                      </li>
                      <li>
                        Các dòng bị trùng lặp hoặc lỗi định dạng email/số điện
                        thoại đã bị bỏ qua để bảo đảm tính nhất quán dữ liệu.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                  <Users className="size-16 text-muted-foreground/35 mb-4 animate-pulse" />
                  <p className="font-bold text-foreground mb-1">
                    Chưa có dữ liệu nhập
                  </p>
                  <p className="text-sm max-w-sm">
                    Tải lên file danh sách khách mời CSV ở cột bên trái để xem
                    kết quả thống kê chi tiết tại đây.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Xóa hạng vé"
        message="Bạn có chắc chắn muốn xóa hạng vé này không? Hành động này sẽ loại bỏ hoàn toàn hạng vé này khỏi sự kiện."
        confirmText="Xóa hạng vé"
        cancelText="Hủy"
        onConfirm={confirmDeleteTicketType}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteTicketTypeId(null);
        }}
        variant="danger"
      />
    </AdminLayout>
  );
}
