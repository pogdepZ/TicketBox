import { AdminLayout } from '@/components/admin-layout';
import { adminUsers } from '@/lib/mock-data';

export default function AdminSettingsPage() {
  const admin = adminUsers[0];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Cài đặt</h1>
          <p className="text-muted-foreground mt-1">Quản lý cấu hình hệ thống và thông tin vận hành</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-8">
              <nav className="space-y-1 p-4">
                <button className="w-full text-left px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition font-medium">
                  Chung
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition">
                  Thanh toán
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition">
                  Email
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition">
                  Bảo mật
                </button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tên công ty</label>
                <input
                  type="text"
                  defaultValue="TicketBox Việt Nam"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tài khoản quản trị</label>
                <input
                  type="text"
                  defaultValue={`${admin.name} - ${admin.role}`}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email hỗ trợ</label>
                <input
                  type="email"
                  defaultValue="support@ticketbox.vn"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tỷ lệ hoa hồng (%)</label>
                <input
                  type="number"
                  defaultValue="5"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tỷ lệ VAT (%)</label>
                <input
                  type="number"
                  defaultValue="10"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Thông báo</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-foreground">Nhận email khi có đơn hàng mới</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-foreground">Nhận email khi vé được hoàn lại</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-foreground">Nhận email báo cáo hằng ngày</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-6 flex justify-end">
                <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
                  Lưu cài đặt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
