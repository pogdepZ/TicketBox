"use client";

import { useEffect } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Application error boundary caught an error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[2rem] border border-border bg-card p-6 md:p-8 text-center shadow-lg shadow-destructive/5 animate-scale-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
            <AlertCircle className="size-8" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-foreground mb-3">
            Không thể tải dữ liệu
          </h2>
          
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Hệ thống đang gặp sự cố kết nối hoặc dữ liệu không tồn tại. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
            {error.message && (
              <span className="block mt-3 p-3 text-xs bg-muted rounded-xl text-left font-mono break-all text-destructive-foreground">
                Lỗi chi tiết: {error.message}
              </span>
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md transition duration-200 hover:bg-primary/95 active:translate-y-px"
            >
              <RotateCcw className="size-4" />
              Thử lại
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground shadow-sm transition duration-200 hover:border-primary/20 hover:text-primary active:translate-y-px"
            >
              <Home className="size-4" />
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
