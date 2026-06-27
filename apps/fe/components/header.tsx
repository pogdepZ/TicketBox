"use client";

import { Bell, LogOut, Search, Ticket, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";
import {
  getProfile,
  logout,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from "@/lib/api";

export function Header() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setShowAccount(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function syncSession() {
      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("access_token")
            : null;
        if (token) {
          const profile = await getProfile();
          setSession({ user: profile });
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      }
    }

    syncSession();

    if (typeof window !== "undefined") {
      window.addEventListener("ticketbox-auth-change", syncSession);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ticketbox-auth-change", syncSession);
      }
    };
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("access_token")
          : null;
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      try {
        const res = await getNotifications();
        setNotifications(res.items);
        setUnreadCount(res.unreadCount);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [session]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      window.dispatchEvent(
        new CustomEvent("ticketbox-toast", {
          detail: {
            title: "Đăng xuất thành công",
            message: "Hẹn gặp lại bạn lần sau!",
            type: "success",
          },
        }),
      );
    } finally {
      setSession(null);
      setShowAccount(false);
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-black tracking-tight text-foreground"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-sm">
            <Ticket className="size-5" />
          </span>
          <span>TicketBox</span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.user?.roles?.some((role: any) => role.name === "admin") && (
            <Link
              href="/admin/dashboard"
              className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary sm:inline-flex"
            >
              Admin
            </Link>
          )}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((current) => !current);
                setShowAccount(false);
              }}
              className="relative grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary cursor-pointer"
              aria-label="Thông báo"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="fixed left-4 right-4 top-20 md:absolute md:left-auto md:right-0 md:top-12 z-50 md:w-80 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-foreground/10">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-foreground">Thông báo</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 text-sm pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground">
                      Không có thông báo nào.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && handleMarkRead(n.id)}
                        className={`rounded-2xl p-3 transition relative ${
                          n.read
                            ? "bg-muted/30 text-muted-foreground"
                            : "bg-muted/70 text-foreground cursor-pointer hover:bg-muted/90"
                        }`}
                      >
                        {!n.read && (
                          <span className="absolute top-3 right-3 size-2 rounded-full bg-primary" />
                        )}
                        <p className="font-bold pr-4">{n.title}</p>
                        <p className="mt-1 text-xs leading-relaxed">
                          {n.message}
                        </p>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <ThemeToggle />
          {session ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAccount((current) => !current);
                  setShowNotifications(false);
                }}
                className="grid size-10 place-items-center rounded-full bg-foreground text-background transition hover:bg-primary cursor-pointer"
                aria-label="Tài khoản"
              >
                <User className="size-5" />
              </button>
              {showAccount && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-foreground/10">
                  <p className="font-black text-foreground">
                    {session.user.fullName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {session.user.roles?.map((role: any, idx: number) => (
                      <span
                        key={`${role.name || role}-${idx}`}
                        className="rounded-2xl bg-muted/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {role.name || role}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href="/my-tickets"
                      onClick={() => setShowAccount(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <Ticket className="size-4" />
                      Vé của tôi
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition hover:border-destructive/40 hover:text-destructive"
                    >
                      <LogOut className="size-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="grid size-10 place-items-center rounded-full bg-foreground text-background transition hover:bg-primary"
              aria-label="Đăng nhập"
            >
              <User className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
