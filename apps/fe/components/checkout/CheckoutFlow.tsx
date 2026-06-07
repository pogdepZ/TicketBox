"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { CheckoutSummary } from '@/components/checkout-summary';
import { checkoutMock, concerts, paymentMethods } from '@/lib/mock-data';
import { createDraftReservation, createMockOrderFromDraft, DraftReservation, getDraftReservation } from '@/lib/mock-reservation';

interface CheckoutViewModel {
  concertId: string;
  concertTitle: string;
  concertDate: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
  selectedSeats: string[];
  customerName: string;
  expiresAt?: string;
}

function fallbackCheckout(): CheckoutViewModel {
  const concert = concerts.find((item) => item.id === checkoutMock.concertId) ?? concerts[0];

  return {
    concertId: concert.id,
    concertTitle: concert.title,
    concertDate: concert.date,
    ticketType: checkoutMock.ticketType,
    quantity: checkoutMock.quantity,
    unitPrice: checkoutMock.unitPrice,
    selectedSeats: checkoutMock.selectedSeats,
    customerName: checkoutMock.customer.name,
    expiresAt: checkoutMock.expiresAt,
  };
}

function fromDraftReservation(draft: DraftReservation): CheckoutViewModel {
  const concert = concerts.find((item) => item.id === draft.concertId);

  return {
    concertId: draft.concertId,
    concertTitle: draft.concertTitle,
    concertDate: concert?.date ?? draft.createdAt,
    ticketType: draft.item.zoneName,
    quantity: draft.item.quantity,
    unitPrice: draft.item.unitPrice,
    selectedSeats: draft.item.seatLabels,
    customerName: 'Nguyễn Minh Anh',
    expiresAt: draft.expiresAt,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function CheckoutFlow() {
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutViewModel>(() => fallbackCheckout());
  const [draftReservation, setDraftReservation] = useState<DraftReservation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const draft = getDraftReservation();
    if (draft) {
      setDraftReservation(draft);
      setCheckout(fromDraftReservation(draft));
    }
  }, []);

  const expiresAtText = useMemo(() => {
    if (!checkout.expiresAt) {
      return '15 phút';
    }

    return new Date(checkout.expiresAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [checkout.expiresAt]);

  function validatePayment() {
    if (paymentMethod !== 'card') {
      return '';
    }

    if (onlyDigits(cardNumber).length < 12) {
      return 'Vui lòng nhập số thẻ hợp lệ.';
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim())) {
      return 'Vui lòng nhập hạn thẻ theo định dạng MM/YY.';
    }

    if (!/^\d{3,4}$/.test(cvv.trim())) {
      return 'Vui lòng nhập CVV gồm 3 hoặc 4 chữ số.';
    }

    return '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validatePayment();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const draft = draftReservation ?? createDraftReservation({
      concertId: checkout.concertId,
      concertTitle: checkout.concertTitle,
      selectedZone: {
        id: checkout.ticketType.toLowerCase(),
        name: checkout.ticketType,
        label: 'Khu đã chọn',
        price: checkout.unitPrice,
        remaining: 0,
        total: checkout.quantity,
        color: '#e5484d',
        description: 'Reservation fallback từ checkout mock.',
        status: 'available',
      },
      selectedSeats: checkout.selectedSeats.map((seatLabel, index) => ({
        id: `checkout-seat-${index}`,
        row: seatLabel.replace(/\d/g, ''),
        number: Number(seatLabel.replace(/\D/g, '')) || index + 1,
        label: seatLabel,
        status: 'available',
        zoneId: checkout.ticketType.toLowerCase(),
      })),
    });
    const order = createMockOrderFromDraft({ draft, paymentMethod });

    router.push(`/success?orderId=${encodeURIComponent(order.id)}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href={`/concert/${checkout.concertId}`}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Quay lại
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="mb-8 rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">Thanh toán</h1>
            <p className="mb-8 text-muted-foreground">Hoàn tất đơn hàng của bạn.</p>

            <div className="mb-8 flex gap-4 rounded-3xl border border-primary/20 bg-primary/10 p-4">
              <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-primary" />
              <div>
                <p className="mb-1 font-black text-foreground">Lưu ý quan trọng</p>
                <p className="text-sm text-muted-foreground">
                  Vui lòng hoàn tất thanh toán trước {expiresAtText}. Vé sẽ tự động được mở bán lại nếu đơn hàng quá hạn.
                </p>
              </div>
            </div>

            <div className="mb-8 border-b border-border pb-8">
              <h2 className="mb-4 text-xl font-black text-foreground">Thông tin vé</h2>
              <div className="space-y-3">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Sự kiện</span>
                  <span className="text-right font-semibold text-foreground">{checkout.concertTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loại vé</span>
                  <span className="font-semibold text-foreground">{checkout.ticketType} ({checkout.quantity} vé)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ghế</span>
                  <span className="font-semibold text-foreground">{checkout.selectedSeats.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày diễn</span>
                  <span className="font-semibold text-foreground">
                    {new Date(checkout.concertDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Người nhận vé</span>
                  <span className="font-semibold text-foreground">{checkout.customerName}</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 text-xl font-black text-foreground">Chọn phương thức thanh toán</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-start rounded-3xl border p-4 transition ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/55 hover:bg-primary/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="mt-1 size-4 accent-[var(--primary)]"
                    />
                    <span className="ml-3">
                      <span className="block font-semibold text-foreground">{method.name}</span>
                      <span className="block text-sm text-muted-foreground">{method.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div className="mb-8 rounded-3xl border border-border bg-muted/55 p-6">
                <h3 className="mb-4 font-black text-foreground">Chi tiết thẻ</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Số thẻ</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(event) => setCardNumber(event.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">MM/YY</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(event) => setExpiry(event.target.value)}
                        placeholder="08/28"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(event) => setCvv(event.target.value)}
                        placeholder="123"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mb-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
            >
              Xác nhận thanh toán
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Bằng cách nhấn vào nút này, bạn đồng ý với Điều khoản và Chính sách của TicketBox.
            </p>
          </form>
        </div>

        <div>
          <CheckoutSummary
            concertTitle={checkout.concertTitle}
            ticketType={checkout.ticketType}
            quantity={checkout.quantity}
            unitPrice={checkout.unitPrice}
            selectedSeats={checkout.selectedSeats}
          />
        </div>
      </div>
    </div>
  );
}
