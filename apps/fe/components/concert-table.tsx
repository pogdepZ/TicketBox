import { Edit, Eye } from "lucide-react";
import Link from "next/link";

interface ConcertTableProps {
  concerts: Array<{
    id: string;
    slug?: string;
    title: string;
    artist: string;
    date: string;
    venue: string;
    capacity: number;
    status?: string;
    rawStatus?: string;
  }>;
  onToggleActive?: (id: string, currentStatus: string) => void;
}

export function ConcertTable({ concerts, onToggleActive }: ConcertTableProps) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[920px]">
        <thead className="border-b border-border bg-muted/77">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Sự kiện
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Nghệ sĩ
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Ngày
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Địa điểm
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Sức chứa
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Trạng thái
            </th>
            <th className="px-6 py-4 text-left text-sm font-black text-foreground">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {concerts.map((concert) => (
            <tr key={concert.id} className="hover:bg-muted/50 transition">
              <td className="px-6 py-4 font-bold text-foreground">
                {concert.title}
              </td>
              <td className="px-6 py-3 text-muted-foreground">
                {concert.artist}
              </td>
              <td className="px-6 py-3 text-muted-foreground">
                {new Date(concert.date).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-6 py-3 text-muted-foreground">
                {concert.venue}
              </td>
              <td className="px-6 py-3 text-muted-foreground">
                {concert.capacity.toLocaleString("vi-VN")}
              </td>
              <td className="px-6 py-3">
                <span
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold border ${
                    concert.status === "Đang bán"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : concert.status === "Sắp hết vé"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : concert.status === "Hết vé"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : concert.status === "Đã kết thúc"
                            ? "bg-muted text-muted-foreground border-muted-foreground/10"
                            : concert.status === "Đã hủy"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : concert.status === "Nháp"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  {concert.status ?? "Đang bán"}
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex gap-3 items-center">
                  <Link
                    href={`/concert/${concert.slug || concert.id}`}
                    target="_blank"
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                    aria-label="Xem sự kiện"
                  >
                    <Eye className="size-4" />
                  </Link>
                  <Link
                    href={`/admin/concerts/${concert.id}`}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                    aria-label="Sửa sự kiện"
                  >
                    <Edit className="size-4" />
                  </Link>

                  {onToggleActive && concert.rawStatus !== "COMPLETED" && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        disabled={concert.rawStatus === "CANCELLED"}
                        onClick={() =>
                          onToggleActive(
                            concert.id,
                            concert.rawStatus || "DRAFT",
                          )
                        }
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          concert.rawStatus === "PUBLISHED"
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-700"
                        } ${
                          concert.rawStatus === "CANCELLED"
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        role="switch"
                        aria-checked={concert.rawStatus === "PUBLISHED"}
                        title={
                          concert.rawStatus === "CANCELLED"
                            ? "Sự kiện đã bị hủy và không thể kích hoạt lại"
                            : concert.rawStatus === "PUBLISHED"
                            ? "Hủy sự kiện (Ngưng kích hoạt)"
                            : "Kích hoạt sự kiện"
                        }
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                            concert.rawStatus === "PUBLISHED"
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
