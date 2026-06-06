import { AdminLayout } from '@/components/admin-layout';
import { ConcertTable } from '@/components/concert-table';
import { adminStats, concerts } from '@/lib/mock-data';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Chào mừng trở lại, Admin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tổng sự kiện</p>
                <p className="text-3xl font-bold text-foreground">{adminStats.totalEvents}</p>
              </div>
              <Calendar className="w-10 h-10 text-primary/20" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vé đã bán</p>
                <p className="text-3xl font-bold text-foreground">{adminStats.ticketsSold.toLocaleString('vi-VN')}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-accent/20" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Doanh thu</p>
                <p className="text-3xl font-bold text-foreground">{Math.round(adminStats.revenue / 1000000000)}Bđ</p>
              </div>
              <BarChart3 className="w-10 h-10 text-primary/20" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Người dùng</p>
                <p className="text-3xl font-bold text-foreground">{adminStats.users.toLocaleString('vi-VN')}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Sự kiện gần đây</h2>
          </div>
          <ConcertTable concerts={concerts} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Bán hàng hàng tháng</h3>
            <div className="h-48 flex items-end gap-2">
              {adminStats.monthlySales.map((value, idx) => (
                <div key={idx} className="flex-1 bg-primary/20 hover:bg-primary/30 transition rounded-t" style={{ height: `${value}%` }} />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Phân bổ loại vé</h3>
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
