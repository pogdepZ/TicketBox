import { LayoutDashboard, List, LogOut, Plus, Settings, Ticket } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="flex border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:fixed lg:inset-y-0 lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex min-w-64 items-center gap-3 border-sidebar-border p-4 lg:border-b lg:p-6">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Ticket className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight">TicketBox</h1>
            <p className="mt-0.5 text-xs text-sidebar-foreground/55">Operations</p>
          </div>
        </div>

        <nav className="flex flex-1 gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-y-auto lg:p-4">
          <Link
            href="/admin/dashboard"
            className="flex shrink-0 items-center gap-3 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            <LayoutDashboard className="size-5" />
            Dashboard
          </Link>
          <Link
            href="/admin/concerts"
            className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2 text-sidebar-foreground/65 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <List className="size-5" />
            Sự kiện
          </Link>
          <Link
            href="/admin/create-concert"
            className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2 text-sidebar-foreground/65 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Plus className="size-5" />
            Tạo sự kiện
          </Link>
          <Link
            href="/admin/settings"
            className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2 text-sidebar-foreground/65 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Settings className="size-5" />
            Cài đặt
          </Link>
        </nav>

        <div className="flex items-center p-3 lg:hidden">
          <ThemeToggle inverse />
        </div>

        <div className="hidden border-t border-sidebar-border p-4 lg:block">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-sidebar-accent p-2 pl-4">
            <span className="text-sm font-bold text-sidebar-foreground/70">Giao diện</span>
            <ThemeToggle inverse />
          </div>
          <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-2 font-bold text-primary transition hover:bg-sidebar-accent">
            <LogOut className="size-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-72">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
