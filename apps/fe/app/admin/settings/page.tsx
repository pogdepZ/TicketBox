import { AdminLayout } from '@/components/admin-layout';
import { adminUsers } from '@/lib/mock-data';

export default function AdminSettingsPage() {
  const admin = adminUsers[0];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Cài đặt</h1>
          <p className="text-muted-foreground mt-1">Quản lý cấu hình hệ thống và thông tin vận hành</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <nav className="space-y-1 p-4">
                <button className="w-full rounded-2xl bg-primary/10 px-4 py-2 text-left font-bold text-primary transition hover:bg-primary/20">
                  Chung
                </button>
                <button className="w-full rounded-2xl px-4 py-2 text-left text-muted-foreground transition hover:bg-muted">
                  Thanh toán
                </button>
                <button className="w-full rounded-2xl px-4 py-2 text-left text-muted-foreground transition hover:bg-muted">
                  Email
                </button>
                <button className="w-full rounded-2xl px-4 py-2 text-left text-muted-foreground transition hover:bg-muted">
                  Bảo mật
                </button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-6 rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tên công ty</label>
                <input
                  type="text"
                  defaultValue="TicketBox Việt Nam"
                  className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tài khoản quản trị</label>
                <input
                  type="text"
                  defaultValue={`${admin.name} - ${admin.role}`}
                  className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email hỗ trợ</label>
                <input
                  type="email"
                  defaultValue="support@ticketbox.vn"
                  className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tỷ lệ hoa hồng (%)</label>
                <input
                  type="number"
                  defaultValue="5"
                  className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tỷ lệ VAT (%)</label>
                <input
                  type="number"
                  defaultValue="10"
                  className="h-11 w-full rounded-2xl border border-border bg-muted px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-lg font-black text-foreground">Thông báo</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="size-4 accent-[var(--primary)]" />
                    <span className="text-foreground">Nhận email khi có đơn hàng mới</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="size-4 accent-[var(--primary)]" />
                    <span className="text-foreground">Nhận email khi vé được hoàn lại</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--primary)]" />
                    <span className="text-foreground">Nhận email báo cáo hằng ngày</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-6 flex justify-end">
                <button className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px">
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
