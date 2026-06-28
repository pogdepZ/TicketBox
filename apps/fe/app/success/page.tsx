"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ETicketCard } from '@/components/eticket-card';
import { getStoredMockOrder, StoredMockOrder } from '@/lib/draft-reservation';
import { getOrderById, addLocalNotification } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle, XCircle, Download, Share2, HomeIcon, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  const [order, setOrder] = useState<StoredMockOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbFailed, setDbFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function loadOrder() {
      if (orderId) {
        try {
          const fetchedOrder = await getOrderById(orderId);
          if (fetchedOrder) {
            const actualStatus = fetchedOrder.status || 'PAID';
            if (actualStatus === 'PAYMENT_FAILED' || actualStatus === 'CANCELLED' || actualStatus === 'EXPIRED') {
              setDbFailed(true);
              setLoading(false);
              return;
            }

            if (actualStatus === 'PENDING_PAYMENT' || actualStatus === 'PAYMENT_PROCESSING') {
              if (retryCount < 5) {
                setTimeout(() => {
                  setRetryCount((prev) => prev + 1);
                }, 2000);
                return;
              }
            }

            let concertTitle = fetchedOrder.concert?.name || fetchedOrder.concert?.title || 'Sự kiện âm nhạc';
            let concertVenue = 'Nhà hát Hòa Bình, TP. Hồ Chí Minh';
            let concertDate = fetchedOrder.createdAt;

            try {
              const { getConcertById } = await import('@/lib/api');
              const concertData = await getConcertById(fetchedOrder.concertId);
              if (concertData) {
                concertTitle = concertData.title;
                concertVenue = concertData.venue || concertData.city || 'TicketBox Arena';
                concertDate = concertData.date || fetchedOrder.createdAt;
              }
            } catch (err) {
              console.warn('Failed to load concert details for success page:', err);
            }

            const draft = typeof window !== 'undefined' ? window.localStorage.getItem('ticketbox-draft-reservation') : null;
            let draftSeats: string[] = [];
            if (draft) {
              try {
                const parsedDraft = JSON.parse(draft);
                if (parsedDraft && parsedDraft.concertId === fetchedOrder.concertId) {
                  draftSeats = parsedDraft.item?.seatLabels || [];
                }
              } catch (e) {
                console.warn('Failed to parse draft for success seat mapping:', e);
              }
            }

            const actualOrderId = fetchedOrder.orderId || fetchedOrder.id || '';
            const actualOrderNumber = fetchedOrder.orderNumber || (actualOrderId ? actualOrderId.substring(0, 8).toUpperCase() : 'UNKNOWN');

            if (!fetchedOrder.tickets) {
              // DB order is real but tickets/concert relations might not be fully seeded/joined
              const subtotal = fetchedOrder.totalAmount ? Number(fetchedOrder.totalAmount) : 0;
              const mappedOrder: StoredMockOrder = {
                id: actualOrderId,
                orderNumber: actualOrderNumber,
                userId: fetchedOrder.userId,
                concertId: fetchedOrder.concertId,
                concertTitle,
                concertVenue,
                reservationId: fetchedOrder.reservationId,
                status: 'PAID', // Treat success page loading as paid
                totalAmount: subtotal,
                paymentMethod: fetchedOrder.paymentMethod || 'MOMO',
                paidAt: fetchedOrder.paidAt || fetchedOrder.createdAt || new Date().toISOString(),
                createdAt: concertDate || fetchedOrder.createdAt || new Date().toISOString(),
                expiresAt: fetchedOrder.expiresAt || new Date().toISOString(),
                items: fetchedOrder.items?.map((item: any) => ({
                  id: item.id,
                  ticketTypeId: item.ticketTypeId,
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                  seatLabels: item.seatLabels || ['Tự do'],
                })) || [],
                tickets: Array.from({ length: fetchedOrder.items?.[0]?.quantity || 1 }).map((_, idx) => {
                  const ticketCode = `TBX-${new Date(fetchedOrder.createdAt || Date.now()).getFullYear()}-${actualOrderId.substring(0, 6).toUpperCase()}-${idx + 1}`;
                  const seatNumber = draftSeats[idx] || 'Tự do';
                  return {
                    id: `ticket-${actualOrderId}-${idx + 1}`,
                    orderId: actualOrderId,
                    ticketTypeId: fetchedOrder.items?.[0]?.ticketTypeId,
                    ticketCode,
                    qrPayload: `mock-qr:${ticketCode}:${fetchedOrder.concertId}:${fetchedOrder.items?.[0]?.ticketTypeId}`,
                    seatZone: fetchedOrder.items?.[0]?.ticketType?.name || 'Standard',
                    seatNumber,
                    price: Number(fetchedOrder.items?.[0]?.unitPrice || subtotal),
                    status: 'ACTIVE' as const,
                    createdAt: fetchedOrder.createdAt || new Date().toISOString(),
                  };
                })
              };
              setOrder(mappedOrder);
              
              const sessionKey = `notified-order-${orderId}`;
              const alreadyNotified = typeof window !== 'undefined' && window.sessionStorage.getItem(sessionKey);
              if (!alreadyNotified) {
                addLocalNotification(
                  'Đặt vé thành công!',
                  `Đơn hàng #${actualOrderNumber} cho sự kiện "${mappedOrder.concertTitle}" đã được đặt thành công.`
                );
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem(sessionKey, 'true');
                }
              }
            } else {
              // fetchedOrder.tickets already exists
              const mappedOrder = {
                ...fetchedOrder,
                id: actualOrderId,
                orderNumber: actualOrderNumber,
                concertTitle,
                concertVenue,
              };
              setOrder(mappedOrder);
              
              const sessionKey = `notified-order-${orderId}`;
              const alreadyNotified = typeof window !== 'undefined' && window.sessionStorage.getItem(sessionKey);
              if (!alreadyNotified) {
                addLocalNotification(
                  'Đặt vé thành công!',
                  `Đơn hàng #${actualOrderNumber} cho sự kiện "${concertTitle}" đã được đặt thành công.`
                );
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem(sessionKey, 'true');
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to load real order:', error);
        }
      }
      setLoading(false);
    }
    loadOrder();
  }, [orderId, retryCount]);

  const isFailed = status === 'failed' || dbFailed;

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

  if (isFailed) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <section className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-rose-500/10 p-4 text-rose-500 shadow-xl shadow-rose-500/5">
              <XCircle className="size-16" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Thanh toán thất bại</h1>
          <p className="mx-auto mb-8 max-w-md text-lg leading-8 text-muted-foreground">
            Giao dịch thanh toán của bạn không thành công hoặc đã bị hủy. Vui lòng thử lại.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-bold text-foreground transition hover:border-primary/40 hover:text-primary active:translate-y-px"
            >
              <HomeIcon className="size-5" />
              Trang chủ
            </Link>
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
            >
              Thử lại thanh toán
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // If order is not found, fallback to display warning or mock default
  if (!order) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <section className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-amber-500/10 p-4 text-amber-500 shadow-xl shadow-amber-500/5">
              <XCircle className="size-16" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Không tìm thấy đơn hàng</h1>
          <p className="mx-auto mb-8 max-w-md text-lg leading-8 text-muted-foreground">
            Đơn hàng của bạn có thể đang được xử lý hoặc không hợp lệ. Vui lòng kiểm tra lại.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
            >
              <HomeIcon className="size-5" />
              Quay lại Trang chủ
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Succeeded payment
  const purchaseDate = new Date(order.paidAt).toLocaleDateString('vi-VN');

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-emerald-500/10 p-4 text-emerald-500 shadow-xl shadow-emerald-500/15">
              <CheckCircle className="size-12" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Đặt vé thành công</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">
            Cảm ơn bạn đã mua vé! Đơn hàng của bạn đã hoàn tất. Bạn có thể xem vé dưới đây hoặc trong trang vé của tôi.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-foreground">Vé của bạn</h2>
          <div className="space-y-6">
            {order.tickets.map((ticket) => (
              <ETicketCard
                key={ticket.id}
                ticketNumber={ticket.ticketCode}
                concertTitle={order.concertTitle}
                date={order.createdAt} // Fallback to order date if concert date isn't saved in draft
                time={new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                venue={order.concertVenue || "Nhà hát Hòa Bình, TP. Hồ Chí Minh"}
                seatZone={ticket.seatZone}
                seatNumber={ticket.seatNumber}
                price={ticket.price}
                purchaseDate={purchaseDate}
                qrPayload={ticket.qrPayload}
              />
            ))}
          </div>
        </div>

        <div className="mb-12 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
          <h3 className="mb-4 text-xl font-black text-foreground">Thông tin đơn hàng</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã đơn hàng</span>
              <span className="font-semibold text-foreground">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày đặt</span>
              <span className="font-semibold text-foreground">{purchaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phương thức thanh toán</span>
              <span className="font-semibold text-foreground">{order.paymentMethod === 'MOMO' ? 'Ví MoMo' : 'VNPay'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng tiền</span>
              <span className="text-lg font-black text-primary">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-[2rem] border border-border bg-muted/50 p-6 md:p-8">
          <h3 className="mb-4 text-xl font-black text-foreground">Các bước tiếp theo</h3>
          <ol className="space-y-4 text-muted-foreground list-decimal pl-5">
            <li>Tải xuống vé điện tử hoặc lưu lại mã QR của từng vé.</li>
            <li>Đến địa điểm sự kiện ít nhất 30 phút trước giờ biểu diễn.</li>
            <li>Xuất trình vé điện tử hoặc mã QR tại cổng soát vé để quét check-in.</li>
          </ol>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-bold text-foreground transition hover:border-primary/40 hover:text-primary active:translate-y-px"
          >
            <HomeIcon className="size-5" />
            Trang chủ
          </Link>
          <Link
            href="/my-tickets"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
          >
            Vé của tôi
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
