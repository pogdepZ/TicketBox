"use client";

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ETicketCard } from '@/components/eticket-card';
import { getProfile, getUserOrders } from '@/lib/api';
import Link from 'next/link';
import { Ticket, ArrowRight, UserCheck } from 'lucide-react';

export default function MyTicketsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = window.localStorage.getItem('access_token');
        if (token) {
          const profile = await getProfile();
          setSession(profile);
          const realOrders = await getUserOrders();
          setOrders(realOrders);
        }
      } catch (err: any) {
        if (err?.statusCode !== 401) {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <section className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary shadow-xl shadow-primary/5">
              <UserCheck className="size-16" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Vui lòng đăng nhập</h1>
          <p className="mx-auto mb-8 max-w-md text-lg leading-8 text-muted-foreground">
            Bạn cần đăng nhập tài khoản để xem danh sách vé điện tử đã đặt mua.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-px cursor-pointer"
          >
            Đăng nhập ngay
            <ArrowRight className="size-5" />
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const allTickets = orders
    .filter(order => order.status === 'PAID')
    .flatMap(order => {
      const tickets = order.tickets || [];
      const orderId = order.id || (order as any).orderId || '';
      const orderNumber = order.orderNumber || (orderId ? orderId.substring(0, 8).toUpperCase() : 'UNKNOWN');
      return tickets.map((ticket: any) => ({
        ...ticket,
        concertTitle: order.concertTitle,
        concertVenue: order.concertVenue || "Nhà hát Hòa Bình, TP. Hồ Chí Minh",
        orderNumber: orderNumber,
        paidAt: order.paidAt || new Date().toISOString(),
      }));
    });

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />

      <section className="flex-grow mx-auto w-full max-w-4xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Ticket className="size-6" />
            </span>
            Vé của tôi
          </h1>
          <p className="text-muted-foreground mt-2">
            Danh sách toàn bộ vé điện tử e-ticket đang hoạt động của bạn.
          </p>
        </div>

        {allTickets.length === 0 ? (
          <div className="text-center py-20 rounded-[2.5rem] border border-dashed border-border bg-card">
            <Ticket className="size-16 text-muted-foreground/35 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">Bạn chưa có vé nào</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Khám phá các sự kiện âm nhạc hấp dẫn và đặt vé ngay hôm nay!
            </p>
            <Link
              href="/#events"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px cursor-pointer"
            >
              Xem danh sách show
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {allTickets.map((ticket) => (
              <ETicketCard
                key={ticket.id}
                ticketNumber={ticket.ticketCode}
                concertTitle={ticket.concertTitle}
                date={ticket.createdAt}
                time={new Date(ticket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                venue={ticket.concertVenue || "Nhà hát Hòa Bình, TP. Hồ Chí Minh"}
                seatZone={ticket.seatZone}
                seatNumber={ticket.seatNumber}
                price={ticket.price}
                purchaseDate={new Date(ticket.paidAt).toLocaleDateString('vi-VN')}
                qrPayload={ticket.qrPayload}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
