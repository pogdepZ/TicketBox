"use client";

import { useEffect, useState } from 'react';
import { X, CheckCircle2, Sparkles, Bell, XCircle } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function handleToastEvent(e: Event) {
      const customEvent = e as CustomEvent<{ title: string; message: string; type?: 'success' | 'info' | 'error' }>;
      const { title, message, type = 'success' } = customEvent.detail;
      const id = `${Date.now()}-${Math.random()}`;
      
      setToasts((prev) => [...prev, { id, title, message, type }]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }

    window.addEventListener('ticketbox-toast', handleToastEvent);
    return () => window.removeEventListener('ticketbox-toast', handleToastEvent);
  }, []);

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!mounted || toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success';
        const isInfo = t.type === 'info';

        return (
          <div
            key={t.id}
            className={`flex gap-3 items-start rounded-3xl border backdrop-blur-xl p-4 shadow-xl shadow-foreground/5 animate-slide-in transition-all duration-300 ${
              isSuccess
                ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                : isError
                ? 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10'
                : isInfo
                ? 'border-primary/20 bg-primary/5'
                : 'border-border/80 bg-card/90'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : isInfo ? (
                <Sparkles className="size-5 text-primary" />
              ) : isError ? (
                <XCircle className="size-5 text-rose-500" />
              ) : (
                <Bell className="size-5 text-amber-500" />
              )}
            </div>
            <div className="flex-grow">
              <h4 className="font-bold text-sm text-foreground">{t.title}</h4>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                {t.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
