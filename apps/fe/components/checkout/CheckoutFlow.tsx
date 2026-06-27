"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { CheckoutSummary } from '@/components/checkout-summary';
import { paymentMethods } from '@/lib/mock-data';
import { createDraftReservation, DraftReservation, getDraftReservation } from '@/lib/draft-reservation';
import { createOrder, createPayment, getFriendlyErrorMessage, getProfile, getOrderById, getConcertById } from '@/lib/api';

interface CheckoutViewModel {
  concertId: string;
  concertTitle: string;
  concertDate: string;
  ticketType: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  selectedSeats: string[];
  customerName: string;
  expiresAt?: string;
  items?: any[];
}

const initialCheckoutState: CheckoutViewModel = {
  concertId: '',
  concertTitle: 'Đang tải...',
  concertDate: '',
  ticketType: '',
  ticketTypeId: '',
  quantity: 0,
  unitPrice: 0,
  selectedSeats: [],
  customerName: '',
  items: [],
};

function fromDraftReservation(draft: DraftReservation): CheckoutViewModel {
  const firstItem = draft.items?.[0];

  return {
    concertId: draft.concertId,
    concertTitle: draft.concertTitle,
    concertDate: draft.createdAt,
    ticketType: firstItem?.zoneName || 'Vé',
    ticketTypeId: firstItem?.ticketTypeId || '',
    quantity: draft.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    unitPrice: firstItem?.unitPrice || 0,
    selectedSeats: draft.items?.flatMap(item => item.seatLabels) || [],
    customerName: 'Nguyễn Minh Anh',
    expiresAt: draft.expiresAt,
    items: draft.items?.map(item => ({
      ticketTypeId: item.ticketTypeId,
      name: item.zoneName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })) || [],
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function CheckoutFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingOrderId = searchParams.get('orderId');

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(() => !!existingOrderId);

  const [checkout, setCheckout] = useState<CheckoutViewModel>(initialCheckoutState);
  const [draftReservation, setDraftReservation] = useState<DraftReservation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingOrderId) return;
    const draft = getDraftReservation();
    if (draft) {
      async function loadConcertForDraft() {
        try {
          const concertDetails = await getConcertById(draft.concertId);
          setCheckout((prev) => ({
            concertId: draft.concertId,
            concertTitle: concertDetails?.name || draft.concertTitle,
            concertDate: concertDetails?.eventDate || draft.createdAt,
            ticketType: draft.items?.[0]?.zoneName || 'Vé',
            ticketTypeId: draft.items?.[0]?.ticketTypeId || '',
            quantity: draft.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            unitPrice: draft.items?.[0]?.unitPrice || 0,
            selectedSeats: draft.items?.flatMap(item => item.seatLabels) || [],
            customerName: prev.customerName || 'Nguyễn Minh Anh',
            expiresAt: draft.expiresAt,
            items: draft.items?.map(item => ({
              ticketTypeId: item.ticketTypeId,
              name: item.zoneName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })) || [],
          }));
        } catch (err) {
          console.warn('Failed to load concert details for draft, using fallback:', err);
          setCheckout(fromDraftReservation(draft));
        }
        setDraftReservation(draft);
      }
      loadConcertForDraft();
    }
  }, [existingOrderId, searchParams]);

  useEffect(() => {
    if (!existingOrderId) return;
    const orderIdStr = existingOrderId;

    async function fetchExistingOrder() {
      setIsLoadingOrder(true);
      setError('');
      try {
        const order = await getOrderById(orderIdStr);
        if (order) {
          if (order.status === 'PAID') {
            router.replace(`/success?orderId=${encodeURIComponent(orderIdStr)}`);
            return;
          }

          // Check if expired
          const now = new Date();
          const expiresAt = new Date(order.expiresAt);
          if (expiresAt <= now || order.status === 'EXPIRED' || order.status === 'CANCELLED') {
            setError('Đơn hàng đã hết hạn hoặc đã bị huỷ. Vui lòng quay lại sự kiện để chọn ghế mới.');
            setIsLoadingOrder(false);
            return;
          }

          // Populate CheckoutViewModel
          const firstItem = order.items?.[0];
          setCheckout((prev) => ({
            concertId: order.concertId,
            concertTitle: order.concertTitle || 'Sự kiện',
            concertDate: order.concertDate || new Date().toISOString(),
            ticketType: firstItem?.name || 'Vé',
            ticketTypeId: firstItem?.ticketTypeId || '',
            quantity: order.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || firstItem?.quantity || 0,
            unitPrice: Number(firstItem?.unitPrice || 0),
            selectedSeats: order.selectedSeats || [],
            customerName: prev.customerName,
            expiresAt: order.expiresAt,
            items: order.items || [],
          }));

          if (order.paymentMethod) {
            setPaymentMethod(order.paymentMethod.toLowerCase());
          }

          setActiveOrderId(order.orderId || order.id);
        }
      } catch (err) {
        console.error('Failed to fetch existing order:', err);
        setError('Không tìm thấy thông tin đơn hàng này hoặc đơn hàng đã bị huỷ.');
      } finally {
        setIsLoadingOrder(false);
      }
    }

    fetchExistingOrder();
  }, [existingOrderId, router]);

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const profile = await getProfile();
        if (profile && (profile.fullName || profile.name)) {
          setCheckout((prev) => ({
            ...prev,
            customerName: profile.fullName || profile.name,
          }));
        }
      } catch (err) {
        console.warn('Failed to load user profile in checkout:', err);
      }
    }
    loadUserProfile();
  }, []);

  const expiresAtText = useMemo(() => {
    if (!checkout.expiresAt) {
      return 'trong vòng 5 phút';
    }

    const timeStr = new Date(checkout.expiresAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `trước ${timeStr}`;
  }, [checkout.expiresAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError('');

    try {
      let orderId = activeOrderId;

      if (!orderId) {
        const idempotencyKey = typeof window !== 'undefined' && window.crypto?.randomUUID 
          ? window.crypto.randomUUID() 
          : `idempotency-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const items = checkout.items && checkout.items.length > 0
          ? checkout.items.map(item => ({
              ticketTypeId: item.ticketTypeId,
              seatNumbers: draftReservation?.items?.find(di => di.ticketTypeId === item.ticketTypeId)?.seatLabels || checkout.selectedSeats,
            }))
          : [{
              ticketTypeId: checkout.ticketTypeId,
              seatNumbers: checkout.selectedSeats,
            }];

        const orderResponse = await createOrder({
          concertId: checkout.concertId,
          items,
          ticketTypeId: checkout.ticketTypeId,
          seatNumbers: checkout.selectedSeats,
        }, idempotencyKey);

        orderId = orderResponse.orderId || orderResponse.data?.orderId || orderResponse.id;
        if (!orderId) {
          throw new Error('Không nhận được Mã đơn hàng từ hệ thống.');
        }

        // Xoá reservation nháp sau khi đã tạo Order thực tế thành công
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('ticketbox-draft-reservation');
        }
      }

      const returnUrl = `${window.location.origin}/checkout/result`;

      const paymentIdempotencyKey = typeof window !== 'undefined' && window.crypto?.randomUUID 
        ? window.crypto.randomUUID() 
        : `idempotency-pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const paymentResponse = await createPayment({
        orderId,
        provider: paymentMethod.toUpperCase(),
        returnUrl,
      }, paymentIdempotencyKey);

      if (paymentResponse.paymentUrl) {
        window.location.href = paymentResponse.paymentUrl;
      } else {
        router.push(`/success?orderId=${encodeURIComponent(orderId)}`);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  if (isLoadingOrder || (!checkout.concertId && !error)) {
    return (
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
    );
  }

  if (error && existingOrderId && !activeOrderId && !isLoadingOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-10" />
        </div>
        <h2 className="mb-2 text-2xl font-black text-foreground">Không thể tiếp tục thanh toán</h2>
        <p className="mb-8 text-muted-foreground">{error}</p>
        <Link
          href="/"
          className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          Quay về Trang chủ
        </Link>
      </div>
    );
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
                  Vui lòng hoàn tất thanh toán {expiresAtText}. Vé sẽ tự động được mở bán lại nếu đơn hàng quá hạn.
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
                {/* Phân bổ hạng vé kèm số ghế tương ứng */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground block mb-1">Chi tiết vé & Ghế ngồi</span>
                  {checkout.items && checkout.items.length > 0 ? (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                      {(() => {
                        let seatIdx = 0;
                        return checkout.items.map((item, idx) => {
                          const itemSeats = [];
                          for (let i = 0; i < item.quantity; i++) {
                            if (checkout.selectedSeats[seatIdx]) {
                              itemSeats.push(checkout.selectedSeats[seatIdx]);
                            }
                            seatIdx++;
                          }
                          return (
                            <div key={idx} className="flex flex-col gap-1 text-sm bg-muted/40 p-2.5 rounded-2xl border border-border/40">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-foreground">{item.name || item.ticketType || 'Vé'}</span>
                                <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                                  {item.quantity} vé
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Ghế: <strong className="text-foreground">{itemSeats.join(', ') || 'Chưa phân bổ'}</strong>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-sm bg-muted/40 p-2.5 rounded-2xl border border-border/40">
                      <span className="font-bold text-foreground">{checkout.ticketType}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full mb-1 inline-block">
                          {checkout.quantity} vé
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Ghế: <strong className="text-foreground">{checkout.selectedSeats.join(', ')}</strong>
                        </p>
                      </div>
                    </div>
                  )}
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



            {error && (
              <p className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive whitespace-pre-line">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mb-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
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
            items={checkout.items}
          />
        </div>
      </div>
    </div>
  );
}
