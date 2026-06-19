"use client";

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import dynamic from 'next/dynamic';

const CheckoutFlow = dynamic(
  () => import('@/components/checkout/CheckoutFlow').then((mod) => mod.CheckoutFlow),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-7xl px-4 py-10 animate-pulse">
        <div className="mb-8 h-10 w-32 rounded-full bg-muted"></div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[400px] rounded-[2rem] bg-muted"></div>
            <div className="h-48 rounded-[2rem] bg-muted"></div>
          </div>
          <div className="h-[500px] rounded-3xl bg-muted"></div>
        </div>
      </div>
    )
  }
);

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <CheckoutFlow />
      <Footer />
    </main>
  );
}
