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
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tạo sự kiện mới</h1>
          <p className="text-muted-foreground mb-8">Thêm một sự kiện mới vào hệ thống bán vé</p>

          <form className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tên sự kiện</label>
                  <input
                    type="text"
                    defaultValue="Live Concert: Thành Phố Về Đêm"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nghệ sĩ</label>
                    <input
                      type="text"
                      defaultValue="Sơn Tùng M-TP"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Thể loại</label>
                    <select defaultValue="Pop" className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
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
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Chi tiết sự kiện</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Ngày</label>
                    <input
                      type="date"
                      defaultValue="2026-09-19"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Giờ</label>
                    <input
                      type="time"
                      defaultValue="19:30"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Địa điểm</label>
                    <input
                      type="text"
                      defaultValue="Sân vận động Quân khu 7"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Thành phố</label>
                    <input
                      type="text"
                      defaultValue="TP. Hồ Chí Minh"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Sức chứa</label>
                    <input
                      type="number"
                      defaultValue="10000"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Giá vé tối thiểu</label>
                    <input
                      type="number"
                      defaultValue={ticketTypes[ticketTypes.length - 1].price}
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Hình ảnh</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition cursor-pointer">
                <p className="text-muted-foreground mb-2">Kéo và thả hình ảnh của bạn ở đây</p>
                <p className="text-xs text-muted-foreground">hoặc nhấn để chọn tệp</p>
              </div>
            </div>

            <div className="border-t border-border pt-6 flex gap-4 justify-end">
              <Link
                href="/admin/concerts"
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition font-medium text-foreground"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
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
