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
            <h1 className="text-4xl font-black tracking-tight text-foreground">Quản lý sự kiện</h1>
            <p className="text-muted-foreground mt-1">Tất cả các sự kiện đang có trong hệ thống</p>
          </div>
          <Link
            href="/admin/create-concert"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
          >
            <Plus className="size-5" />
            Tạo sự kiện
          </Link>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <button className="rounded-full border border-border bg-card px-5 py-2 font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary">
            Bộ lọc
          </button>
        </div>

        <ConcertTable concerts={concerts} />
      </div>
    </AdminLayout>
  );
}
