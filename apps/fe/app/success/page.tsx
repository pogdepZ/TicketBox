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

      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-500/20 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Đặt vé thành công!</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Vé của bạn đã được xác nhận và sẽ được gửi đến email {checkoutMock.customer.email}.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Vé của bạn</h2>
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

        <div className="bg-card rounded-lg p-8 border border-border mb-12">
          <h3 className="text-xl font-bold text-foreground mb-4">Thông tin đơn hàng</h3>
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
              <span className="font-bold text-primary text-lg">{total.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-8 border border-border mb-12">
          <h3 className="text-xl font-bold text-foreground mb-4">Các bước tiếp theo</h3>
          <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
            <li>Kiểm tra email xác nhận với toàn bộ chi tiết vé.</li>
            <li>Tải xuống vé điện tử hoặc lưu lại mã QR.</li>
            <li>Đến địa điểm ít nhất 30 phút trước giờ diễn.</li>
            <li>Xuất trình vé điện tử hoặc mã QR tại cổng soát vé.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-primary text-primary rounded-lg hover:bg-primary/10 transition font-medium"
          >
            <HomeIcon className="w-5 h-5" />
            Trang chủ
          </Link>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
            <Download className="w-5 h-5" />
            Tải xuống vé
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition font-medium">
            <Share2 className="w-5 h-5" />
            Chia sẻ
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
