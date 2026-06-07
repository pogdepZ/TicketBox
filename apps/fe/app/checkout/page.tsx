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

      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link
          href={`/concert/${concert.id}`}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8 rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
              <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">Thanh toán</h1>
              <p className="mb-8 text-muted-foreground">Hoàn tất đơn hàng của bạn.</p>

              <div className="mb-8 flex gap-4 rounded-3xl border border-primary/20 bg-primary/10 p-4">
                <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="mb-1 font-black text-foreground">Lưu ý quan trọng</p>
                  <p className="text-sm text-muted-foreground">
                    Vui lòng hoàn tất thanh toán trong 15 phút. Vé sẽ tự động được mở bán lại nếu đơn hàng quá hạn.
                  </p>
                </div>
              </div>

              <div className="mb-8 pb-8 border-b border-border">
                <h2 className="mb-4 text-xl font-black text-foreground">Thông tin vé</h2>
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
                <h2 className="mb-4 text-xl font-black text-foreground">Chọn phương thức thanh toán</h2>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className="flex cursor-pointer items-start rounded-3xl border border-border p-4 transition hover:border-primary/55 hover:bg-primary/5"
                    >
                      <input type="radio" name="payment" value={method.id} defaultChecked={method.id === 'card'} className="mt-1 size-4 accent-[var(--primary)]" />
                      <span className="ml-3">
                        <span className="block font-semibold text-foreground">{method.name}</span>
                        <span className="block text-sm text-muted-foreground">{method.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8 rounded-3xl border border-border bg-muted/55 p-6">
                <h3 className="mb-4 font-black text-foreground">Chi tiết thẻ</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Số thẻ</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">MM/YY</label>
                      <input
                        type="text"
                        placeholder="08/28"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="mb-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px">
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
