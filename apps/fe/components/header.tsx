import { Search, User, Bell } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          TicketBox
        </Link>

        <div className="hidden md:flex flex-1 mx-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Admin
          </Link>
          <button className="p-2 hover:bg-muted rounded-lg transition" aria-label="Thông báo">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition" aria-label="Tài khoản">
            <User className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
