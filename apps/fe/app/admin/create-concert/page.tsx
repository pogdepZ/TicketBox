import { AdminLayout } from '@/components/admin-layout';
import { ticketTypes } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateConcertPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <Link
          href="/admin/concerts"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>

        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-foreground">Tạo sự kiện mới</h1>
          <p className="text-muted-foreground mb-8">Thêm một sự kiện mới vào hệ thống bán vé</p>

          <form className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-black text-foreground">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tên sự kiện</label>
                  <input
                    type="text"
                    defaultValue="Live Concert: Thành Phố Về Đêm"
                    className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nghệ sĩ</label>
                    <input
                      type="text"
                      defaultValue="Sơn Tùng M-TP"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Thể loại</label>
                    <select defaultValue="Pop" className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15">
                      <option>Classical</option>
                      <option>EDM</option>
                      <option>Jazz</option>
                      <option>Rock</option>
                      <option>Pop</option>
                      <option>Indie</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Mô tả</label>
                  <textarea
                    defaultValue="Đêm diễn mùa hè với sân khấu ngoài trời, hệ thống ánh sáng mới và nhiều khách mời đặc biệt."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-black text-foreground">Chi tiết sự kiện</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Ngày</label>
                    <input
                      type="date"
                      defaultValue="2026-09-19"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Giờ</label>
                    <input
                      type="time"
                      defaultValue="19:30"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Địa điểm</label>
                    <input
                      type="text"
                      defaultValue="Sân vận động Quân khu 7"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Thành phố</label>
                    <input
                      type="text"
                      defaultValue="TP. Hồ Chí Minh"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Sức chứa</label>
                    <input
                      type="number"
                      defaultValue="10000"
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Giá vé tối thiểu</label>
                    <input
                      type="number"
                      defaultValue={ticketTypes[ticketTypes.length - 1].price}
                      className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-black text-foreground">Hình ảnh</h3>
              <div className="cursor-pointer rounded-3xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition hover:border-primary/50">
                <p className="text-muted-foreground mb-2">Kéo và thả hình ảnh của bạn ở đây</p>
                <p className="text-xs text-muted-foreground">hoặc nhấn để chọn tệp</p>
              </div>
            </div>

            <div className="border-t border-border pt-6 flex gap-4 justify-end">
              <Link
                href="/admin/concerts"
                className="rounded-full border border-border px-6 py-3 font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
              >
                Tạo sự kiện
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
