import { LayoutDashboard, List, Plus, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TicketBox
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Quản lý</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/admin/concerts"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition"
          >
            <List className="w-5 h-5" />
            Sự kiện
          </Link>
          <Link
            href="/admin/create-concert"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition"
          >
            <Plus className="w-5 h-5" />
            Tạo sự kiện
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition"
          >
            <Settings className="w-5 h-5" />
            Cài đặt
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition font-medium">
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
