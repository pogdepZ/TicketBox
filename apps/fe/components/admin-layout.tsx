"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, List, LogOut, Plus, Settings, Ticket, Home, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { getProfile, logout } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = window.localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }
        const profile = await getProfile();
        const isAdmin = profile?.roles?.some((role: any) => role.name === 'admin');
        if (isAdmin) {
          setAuthorized(true);
        } else {
          router.push('/');
        }
      } catch (err: any) {
        if (err?.statusCode !== 401) {
          console.error(err);
        }
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const menuItems = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/concerts',
      label: 'Sự kiện',
      icon: List,
      exact: false, // matches subroutes like /admin/concerts/:id
      extraMatches: ['/admin/create-concert'],
    },
    {
      href: '/admin/analytics',
      label: 'Phân tích',
      icon: BarChart3,
      exact: true,
    },
    {
      href: '/admin/users',
      label: 'Người dùng',
      icon: Users,
      exact: true,
    },
    {
      href: '/admin/settings',
      label: 'Cài đặt',
      icon: Settings,
      exact: true,
    },
  ];

  const isActive = (item: any) => {
    if (item.exact) {
      return pathname === item.href;
    }
    if (pathname.startsWith(item.href)) {
      return true;
    }
    if (item.extraMatches && item.extraMatches.some((path: string) => pathname.startsWith(path))) {
      return true;
    }
    return false;
  };

  async function handleLogout() {
    try {
      await logout();
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Đăng xuất thành công',
            message: 'Hẹn gặp lại bạn lần sau!',
            type: 'success',
          },
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      router.push('/');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar Container */}
      <aside className="flex flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r shadow-2xl z-30 transition-all duration-300">
        
        {/* Logo and Brand Header */}
        <div className="flex items-center gap-3 border-sidebar-border p-5 lg:border-b lg:py-6 lg:px-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Ticket className="size-5.5" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              TicketBox
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-sidebar-foreground/45 mt-0.5">
              Hệ thống Quản trị
            </p>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex flex-row overflow-x-auto p-3 gap-1.5 lg:flex-col lg:overflow-y-auto lg:p-5 lg:flex-grow">
          {menuItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10 scale-[1.02]'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
                }`}
              >
                <Icon className={`size-5 ${active ? 'text-primary-foreground' : 'text-sidebar-foreground/45'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Panel */}
        <div className="border-t border-sidebar-border p-5 hidden lg:flex flex-col gap-4">
          
          {/* Back to Homepage */}
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
          >
            <Home className="size-5 text-sidebar-foreground/40" />
            Về Trang chủ
          </Link>

          {/* Theme Toggle */}
          <div className="flex items-center pl-1.5">
            <ThemeToggle inverse />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="size-5" />
            Đăng xuất
          </button>
        </div>

        {/* Mobile View Bottom Panels */}
        <div className="flex items-center gap-2 p-3 lg:hidden border-t border-sidebar-border/30 bg-sidebar-accent/50 justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-sidebar-foreground/60 px-3 py-1.5 rounded-xl hover:bg-sidebar-accent"
          >
            <Home className="size-4" />
            Trang chủ
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle inverse />
            <button
              onClick={handleLogout}
              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
              aria-label="Đăng xuất"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 lg:pl-72 transition-all duration-300">
        <div className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
