"use client";

import { Bell, LogOut, Search, Ticket, User, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("all");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const DEFAULT_CITIES = ["Thành phố Hồ Chí Minh", "Thành phố Hà Nội", "Tỉnh Lâm Đồng"];
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

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
      if (
        cityRef.current &&
        !cityRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Read initial filter values from URL on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setKeyword(params.get("q") || "");
      setCity(params.get("city") || "all");
    }
  }, []);

  // Sync cities list from the ConcertBrowser if available
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__ticketbox_cities) {
      setCities((window as any).__ticketbox_cities);
    }

    function handleCitiesLoaded(event: Event) {
      const loadedCities = (event as CustomEvent<{ cities: string[] }>).detail?.cities ?? [];
      if (loadedCities.length > 0) {
        setCities(loadedCities);
      }
    }
    window.addEventListener("ticketbox-cities-loaded", handleCitiesLoaded);
    return () => {
      window.removeEventListener("ticketbox-cities-loaded", handleCitiesLoaded);
    };
  }, []);

  // Listen for filter changes from other components (like clearFilters)
  useEffect(() => {
    function handleFilterChange(event: Event) {
      const detail = (event as CustomEvent<{ keyword?: string; city?: string }>).detail;
      if (detail) {
        if (detail.keyword !== undefined) setKeyword(detail.keyword);
        if (detail.city !== undefined) setCity(detail.city);
      }
    }

    window.addEventListener("ticketbox-filter-change", handleFilterChange);
    return () => {
      window.removeEventListener("ticketbox-filter-change", handleFilterChange);
    };
  }, []);

  const dispatchFilterChange = (newKeyword: string, newCity: string) => {
    window.dispatchEvent(
      new CustomEvent("ticketbox-filter-change", {
        detail: { keyword: newKeyword, city: newCity },
      })
    );

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (newKeyword) {
        params.set("q", newKeyword);
      } else {
        params.delete("q");
      }
      if (newCity && newCity !== "all") {
        params.set("city", newCity);
      } else {
        params.delete("city");
      }
      const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    if (pathname === "/") {
      dispatchFilterChange(val, city);
    }
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pathname !== "/") {
      const params = new URLSearchParams();
      if (keyword) params.set("q", keyword);
      if (city !== "all") params.set("city", city);
      router.push(`/?${params.toString()}`);
    }
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityDropdown(false);

    if (pathname === "/") {
      dispatchFilterChange(keyword, selectedCity);
    } else {
      const params = new URLSearchParams();
      if (keyword) params.set("q", keyword);
      if (selectedCity !== "all") params.set("city", selectedCity);
      router.push(`/?${params.toString()}`);
    }
  };

  const clearKeyword = () => {
    setKeyword("");
    if (pathname === "/") {
      dispatchFilterChange("", city);
    }
  };

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

    if (typeof window !== "undefined") {
      window.addEventListener("ticketbox-notification-change", loadNotifications);
    }

    const interval = setInterval(loadNotifications, 30000); // 30 seconds polling

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("ticketbox-notification-change", loadNotifications);
      }
    };
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
          className="flex items-center gap-3 text-lg font-black tracking-tight text-foreground shrink-0"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-sm shrink-0">
            <Ticket className="size-5" />
          </span>
          <span className="hidden md:inline">TicketBox</span>
        </Link>

        {/* Global Search and Location filter pill in Header */}
        <div className="flex-1 max-w-xs md:max-w-md mx-2 md:mx-4">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm w-full focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15 transition-all duration-300">
            {/* Search field */}
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3 size-4 text-muted-foreground" />
              <input
                type="text"
                value={keyword}
                onChange={handleKeywordChange}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Tìm concert, nghệ sĩ, địa điểm..."
                className="w-full bg-transparent pl-9 pr-6 py-1.5 text-xs md:text-sm focus:outline-none text-foreground placeholder:text-muted-foreground/60"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={clearKeyword}
                  className="absolute right-1 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="w-px h-5 bg-border self-center" />

            {/* City selector dropdown */}
            <div className="relative" ref={cityRef}>
              <button
                type="button"
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-primary rounded-full hover:bg-muted/50 transition cursor-pointer whitespace-nowrap"
              >
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="max-w-[70px] md:max-w-[120px] truncate">
                  {city === "all" ? "Tỉnh/Thành" : city}
                </span>
              </button>

              {showCityDropdown && (
                <div className="absolute right-0 mt-2 z-50 w-48 md:w-56 rounded-2xl border border-border bg-card p-1.5 md:p-2 shadow-xl shadow-foreground/10">
                  <button
                    type="button"
                    onClick={() => handleCitySelect("all")}
                    className={`w-full text-left px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-xs md:text-sm transition-all duration-200 hover:bg-muted/70 flex items-center justify-between cursor-pointer ${
                      city === "all" ? "text-primary font-bold bg-primary/10" : "text-foreground"
                    }`}
                  >
                    Tất cả địa điểm
                  </button>
                  {cities.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleCitySelect(item)}
                      className={`w-full text-left px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-xs md:text-sm transition-all duration-200 hover:bg-muted/70 flex items-center justify-between cursor-pointer ${
                        city === item ? "text-primary font-bold bg-primary/10" : "text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

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
