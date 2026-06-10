'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { CheckCircle2, XCircle, Home, Calendar, CreditCard, Ticket } from 'lucide-react';

function CheckoutResultContent() {
  const searchParams = useSearchParams();

  // Extract VNPAY parameters
  const responseCode = searchParams.get('vnp_ResponseCode');
  const transactionStatus = searchParams.get('vnp_TransactionStatus');
  const vnpAmountStr = searchParams.get('vnp_Amount');
  const vnpTxnRef = searchParams.get('vnp_TxnRef');
  const bankCode = searchParams.get('vnp_BankCode');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo');
  const vnpPayDateStr = searchParams.get('vnp_PayDate');

  // Extract MoMo parameters
  const momoResultCode = searchParams.get('resultCode');
  const momoTxnRef = searchParams.get('orderId');
  const momoTransactionNo = searchParams.get('transId');
  const momoAmountStr = searchParams.get('amount');
  const momoPayDateStr = searchParams.get('responseTime');
  const momoMessage = searchParams.get('message');
  const momoPayType = searchParams.get('payType');

  const provider = momoResultCode !== null ? 'MOMO' : 'VNPAY';
  const txnRef = provider === 'MOMO' ? momoTxnRef : vnpTxnRef;
  const transactionNo = provider === 'MOMO' ? momoTransactionNo : vnpTransactionNo;
  const amountStr = provider === 'MOMO' ? momoAmountStr : vnpAmountStr;
  const payDateStr = provider === 'MOMO' ? momoPayDateStr : vnpPayDateStr;
  const isSuccess =
    provider === 'MOMO'
      ? momoResultCode === '0'
      : responseCode === '00' || transactionStatus === '00';

  // Format amount
  const rawAmount = amountStr ? Number(amountStr) : 0;
  const amountInVnd = provider === 'MOMO' ? rawAmount : rawAmount / 100;

  // Format payDate (YYYYMMDDHHmmss -> DD/MM/YYYY HH:mm:ss)
  const formatPayDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    if (provider === 'MOMO') {
      return new Date(Number(dateStr)).toLocaleString('vi-VN');
    }
    if (dateStr.length < 14) return 'N/A';

    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(8, 10);
    const minute = dateStr.slice(10, 12);
    const second = dateStr.slice(12, 14);
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          {isSuccess ? (
            <div className="rounded-full bg-emerald-500/10 p-4 text-emerald-500 shadow-xl shadow-emerald-500/10 animate-bounce">
              <CheckCircle2 className="size-16" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-500/10 p-4 text-rose-500 shadow-xl shadow-rose-500/10 animate-pulse">
              <XCircle className="size-16" />
            </div>
          )}
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
          {isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
        </h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          {isSuccess
            ? 'Đơn hàng của bạn đã được thanh toán thành công. Hệ thống đang tiến hành phát hành vé.'
            : 'Đã xảy ra lỗi trong quá trình xử lý giao dịch. Vui lòng kiểm tra lại số dư thẻ hoặc thử lại.'}
        </p>
      </div>

      {/* Transaction Details Card */}
      <div className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="mb-6 text-xl font-black text-foreground">Chi tiết giao dịch</h2>
        <div className="space-y-4">
          <div className="flex justify-between border-b border-border/50 pb-3">
            <span className="text-muted-foreground">Nhà cung cấp</span>
            <span className="font-bold text-foreground">{provider}</span>
          </div>

          {txnRef && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Mã tham chiếu đơn hàng</span>
              <span className="font-mono font-bold text-foreground">{txnRef}</span>
            </div>
          )}

          {transactionNo && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Mã giao dịch {provider}</span>
              <span className="font-mono font-bold text-foreground">{transactionNo}</span>
            </div>
          )}

          {amountStr && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Số tiền thanh toán</span>
              <span className="text-lg font-black text-primary">
                {amountInVnd.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}

          {bankCode && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Ngân hàng</span>
              <span className="font-semibold text-foreground">{bankCode}</span>
            </div>
          )}

          {momoPayType && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Kênh thanh toán</span>
              <span className="font-semibold text-foreground">{momoPayType}</span>
            </div>
          )}

          {momoMessage && (
            <div className="flex justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Thông báo</span>
              <span className="text-right font-semibold text-foreground">{momoMessage}</span>
            </div>
          )}

          {payDateStr && (
            <div className="flex justify-between pb-1">
              <span className="text-muted-foreground">Thời gian thanh toán</span>
              <span className="font-semibold text-foreground">{formatPayDate(payDateStr)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Next steps advice */}
      {isSuccess && (
        <div className="mb-8 rounded-[2rem] border border-border bg-muted/40 p-6 md:p-8">
          <h3 className="mb-3 text-lg font-black text-foreground">Lưu ý tiếp theo</h3>
          <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
            <li>Thông tin vé và QR Check-in sẽ được cập nhật trong tài khoản của bạn.</li>
            <li>Hệ thống gửi email xác nhận kèm vé điện tử (nếu có).</li>
            <li>Vui lòng không chia sẻ mã vé hoặc mã QR cho người khác.</li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-3.5 font-bold text-foreground transition hover:border-primary/40 hover:text-primary active:translate-y-px"
        >
          <Home className="size-5" />
          Trang chủ
        </Link>
        {isSuccess ? (
          <Link
            href="/success"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-bold text-primary-foreground transition hover:bg-primary/95 active:translate-y-px shadow-lg shadow-primary/10"
          >
            <Ticket className="size-5" />
            Xem vé của tôi
          </Link>
        ) : (
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-bold text-primary-foreground transition hover:bg-primary/95 active:translate-y-px shadow-lg shadow-primary/10"
          >
            Thử lại thanh toán
          </Link>
        )}
      </div>
    </section>
  );
}

export default function CheckoutResultPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground font-medium">Đang tải kết quả giao dịch...</p>
          </div>
        </div>
      }>
        <CheckoutResultContent />
      </Suspense>
      <Footer />
    </main>
  );
}
