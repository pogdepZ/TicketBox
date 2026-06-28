"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDraftReservation, createMockOrderFromDraft } from '@/lib/draft-reservation';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function MockPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const provider = searchParams.get('provider') || 'MOMO';
  const paymentRef = searchParams.get('paymentRef') || 'REF-MOCK';
  const returnUrl = searchParams.get('returnUrl') || '/';

  let orderId: string | undefined;
  try {
    const url = new URL(returnUrl, window.location.origin);
    orderId = url.searchParams.get('orderId') || undefined;
  } catch {
    // ignore
  }

  useEffect(() => {
    const draftRes = getDraftReservation();
    setDraft(draftRes);
  }, []);

  const handlePayment = (status: 'SUCCESS' | 'FAILED') => {
    setLoading(true);
    setTimeout(() => {
      if (status === 'SUCCESS' && draft) {
        // Create mock order in LocalStorage as fallback
        createMockOrderFromDraft({
          draft,
          paymentMethod: provider,
          orderId,
        });
      }
      
      // Redirect back to return URL
      // If payment failed, we can redirect back to success page with status=failed or similar,
      // but returnUrl is usually success page. Let's redirect to returnUrl with a status parameter.
      const url = new URL(returnUrl, window.location.origin);
      url.searchParams.set('status', status.toLowerCase());
      router.push(url.pathname + url.search);
    }, 1500);
  };

  const amount = draft ? (draft.item.quantity * draft.item.unitPrice * 1.15).toLocaleString('vi-VN') : '0';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-slate-950/50">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground font-black">
              P
            </span>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cổng Thanh Toán</p>
              <h1 className="text-base font-black text-white">TicketBox Pay</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
            <ShieldCheck className="size-3.5" />
            Bảo mật
          </span>
        </div>

        {/* Info Box */}
        <div className="my-8 space-y-4">
          <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800/80">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Số tiền thanh toán</p>
            <p className="text-3xl font-black text-primary">{amount}đ</p>
            
            <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-slate-400">Nhà cung cấp</span>
              <span className="text-right font-bold text-slate-200">{provider === 'MOMO' ? 'Ví MoMo' : 'VNPay'}</span>
              
              <span className="text-slate-400">Mã giao dịch</span>
              <span className="text-right font-mono text-slate-200 truncate pl-4">{paymentRef}</span>
              
              <span className="text-slate-400">Sự kiện</span>
              <span className="text-right font-bold text-slate-200 truncate pl-4">{draft?.concertTitle || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {loading ? (
          <div className="text-center py-6">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-semibold text-slate-300">Đang xử lý giao dịch...</p>
            <p className="text-xs text-slate-500 mt-1">Vui lòng không tắt trình duyệt</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handlePayment('SUCCESS')}
              className="w-full h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition font-bold text-slate-950 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="size-5" />
              Thanh toán Thành công
            </button>
            <button
              onClick={() => handlePayment('FAILED')}
              className="w-full h-12 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-[0.99] transition font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="size-5" />
              Thanh toán Thất bại
            </button>
            
            <div className="pt-4 flex gap-2 text-xs text-slate-500 justify-center">
              <AlertTriangle className="size-4 text-slate-600 flex-shrink-0" />
              <span>Đây là trang thanh toán giả lập dành cho môi trường thử nghiệm.</span>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
