import { AdminLayout } from '@/components/admin-layout';
import { ConcertTable } from '@/components/concert-table';
import { adminStats, concerts } from '@/lib/mock-data';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan bán vé và vận hành sự kiện.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tổng sự kiện</p>
                <p className="text-3xl font-black text-foreground">{adminStats.totalEvents}</p>
              </div>
              <Calendar className="size-10 text-primary/25" />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vé đã bán</p>
                <p className="text-3xl font-black text-foreground">{adminStats.ticketsSold.toLocaleString('vi-VN')}</p>
              </div>
              <TrendingUp className="size-10 text-accent/25" />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Doanh thu</p>
                <p className="text-3xl font-black text-foreground">{Math.round(adminStats.revenue / 1000000000)}Bđ</p>
              </div>
              <BarChart3 className="size-10 text-primary/25" />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Người dùng</p>
                <p className="text-3xl font-black text-foreground">{adminStats.users.toLocaleString('vi-VN')}</p>
              </div>
              <Users className="size-10 text-primary/25" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-foreground">Sự kiện gần đây</h2>
          </div>
          <ConcertTable concerts={concerts} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-foreground">Bán hàng hàng tháng</h3>
            <div className="h-48 flex items-end gap-2">
              {adminStats.monthlySales.map((value, idx) => (
                <div key={idx} className="flex-1 rounded-t-xl bg-primary/25 transition hover:bg-primary/50" style={{ height: `${value}%` }} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-foreground">Phân bổ loại vé</h3>
            <div className="space-y-3">
              {adminStats.ticketDistribution.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
