import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CheckoutSummary } from '@/components/checkout-summary';
import { checkoutMock, concerts, paymentMethods } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function CheckoutPage() {
  const concert = concerts.find((item) => item.id === checkoutMock.concertId) ?? concerts[0];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link
          href={`/concert/${concert.id}`}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition font-medium mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg p-8 border border-border mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Thanh toán</h1>
              <p className="text-muted-foreground mb-8">Hoàn tất đơn hàng của bạn</p>

              <div className="flex gap-4 p-4 bg-accent/10 border border-accent/20 rounded-lg mb-8">
                <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Lưu ý quan trọng</p>
                  <p className="text-sm text-muted-foreground">
                    Vui lòng hoàn tất thanh toán trong 15 phút. Vé sẽ tự động được mở bán lại nếu đơn hàng quá hạn.
                  </p>
                </div>
              </div>

              <div className="mb-8 pb-8 border-b border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Thông tin vé</h2>
                <div className="space-y-3">
                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">Sự kiện</span>
                    <span className="font-semibold text-foreground text-right">{concert.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loại vé</span>
                    <span className="font-semibold text-foreground">{checkoutMock.ticketType} ({checkoutMock.quantity} vé)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày diễn</span>
                    <span className="font-semibold text-foreground">
                      {new Date(concert.date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Người nhận vé</span>
                    <span className="font-semibold text-foreground">{checkoutMock.customer.name}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4">Chọn phương thức thanh toán</h2>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className="flex items-start p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition"
                    >
                      <input type="radio" name="payment" value={method.id} defaultChecked={method.id === 'card'} className="w-4 h-4 mt-1" />
                      <span className="ml-3">
                        <span className="block font-semibold text-foreground">{method.name}</span>
                        <span className="block text-sm text-muted-foreground">{method.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8 p-6 bg-muted rounded-lg border border-border">
                <h3 className="font-bold text-foreground mb-4">Chi tiết thẻ</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Số thẻ</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">MM/YY</label>
                      <input
                        type="text"
                        placeholder="08/28"
                        className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition mb-4">
                Xác nhận thanh toán
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Bằng cách nhấn vào nút này, bạn đồng ý với Điều khoản và Chính sách của TicketBox.
              </p>
            </div>
          </div>

          <div>
            <CheckoutSummary
              concertTitle={concert.title}
              ticketType={checkoutMock.ticketType}
              quantity={checkoutMock.quantity}
              unitPrice={checkoutMock.unitPrice}
              selectedSeats={checkoutMock.selectedSeats}
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
