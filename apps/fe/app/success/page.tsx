import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ETicketCard } from '@/components/eticket-card';
import { checkoutMock, concerts, orderMock } from '@/lib/mock-data';
import Link from 'next/link';
import { CheckCircle, Download, Share2, HomeIcon } from 'lucide-react';

export default function SuccessPage() {
  const concert = concerts.find((item) => item.id === checkoutMock.concertId) ?? concerts[0];
  const subtotal = checkoutMock.quantity * checkoutMock.unitPrice;
  const total = subtotal + Math.round(subtotal * 0.05) + Math.round(subtotal * 0.1);
  const purchaseDate = new Date(orderMock.purchaseDate).toLocaleDateString('vi-VN');

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-accent p-4 text-accent-foreground shadow-xl shadow-accent/15">
              <CheckCircle className="size-12" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Đặt vé thành công</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">
            Vé của bạn đã được xác nhận và sẽ được gửi đến email {checkoutMock.customer.email}.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-foreground">Vé của bạn</h2>
          <div className="space-y-6">
            {orderMock.tickets.map((ticket) => (
              <ETicketCard
                key={ticket.ticketNumber}
                ticketNumber={ticket.ticketNumber}
                concertTitle={concert.title}
                date={concert.date}
                time={concert.time}
                venue={`${concert.venue}, ${concert.city}`}
                seatZone={ticket.seatZone}
                seatNumber={ticket.seatNumber}
                price={checkoutMock.unitPrice}
                purchaseDate={purchaseDate}
              />
            ))}
          </div>
        </div>

        <div className="mb-12 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
          <h3 className="mb-4 text-xl font-black text-foreground">Thông tin đơn hàng</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã đơn hàng</span>
              <span className="font-semibold text-foreground">{orderMock.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày đặt</span>
              <span className="font-semibold text-foreground">{purchaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thanh toán</span>
              <span className="font-semibold text-foreground">{orderMock.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng tiền</span>
              <span className="text-lg font-black text-primary">{total.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-[2rem] border border-border bg-muted/50 p-6 md:p-8">
          <h3 className="mb-4 text-xl font-black text-foreground">Các bước tiếp theo</h3>
          <ol className="space-y-4 text-muted-foreground">
            <li>Kiểm tra email xác nhận với toàn bộ chi tiết vé.</li>
            <li>Tải xuống vé điện tử hoặc lưu lại mã QR.</li>
            <li>Đến địa điểm ít nhất 30 phút trước giờ diễn.</li>
            <li>Xuất trình vé điện tử hoặc mã QR tại cổng soát vé.</li>
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
          <button className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px">
            <Download className="size-5" />
            Tải xuống vé
          </button>
          <button className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground transition hover:bg-accent/90 active:translate-y-px">
            <Share2 className="size-5" />
            Chia sẻ
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
