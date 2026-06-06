import { AdminLayout } from '@/components/admin-layout';
import { ConcertTable } from '@/components/concert-table';
import { concerts } from '@/lib/mock-data';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';

export default function AdminConcertsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Quản lý sự kiện</h1>
            <p className="text-muted-foreground mt-1">Tất cả các sự kiện đang có trong hệ thống</p>
          </div>
          <Link
            href="/admin/create-concert"
            className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Tạo sự kiện
          </Link>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition font-medium text-foreground">
            Bộ lọc
          </button>
        </div>

        <ConcertTable concerts={concerts} />
      </div>
    </AdminLayout>
  );
}
