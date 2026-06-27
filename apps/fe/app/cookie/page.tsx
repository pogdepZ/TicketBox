import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CookiePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-4xl px-4 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          Quay lại trang chủ
        </Link>
      </div>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            Pháp lý
          </span>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl leading-[1.1]">
            Chính sách Cookie
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Cập nhật lần cuối: 27/06/2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-6 text-sm leading-relaxed">
          <p>
            Trang web TicketBox sử dụng cookie để mang lại trải nghiệm tốt nhất cho bạn. Cookie là các tệp văn bản nhỏ được lưu trữ trên thiết bị của bạn khi truy cập trang web.
          </p>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Phân loại cookie chúng tôi sử dụng</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Cookie bắt buộc:</strong> Cần thiết cho các chức năng cơ bản của trang web hoạt động, như duy trì phiên đăng nhập và giỏ hàng vé.
              </li>
              <li>
                <strong>Cookie phân tích:</strong> Giúp chúng tôi hiểu cách khách hàng tương tác với trang web, từ đó cải tiến giao diện đặt vé trực quan hơn.
              </li>
              <li>
                <strong>Cookie tuỳ chỉnh:</strong> Ghi nhớ các tuỳ chọn của bạn, ví dụ như chế độ giao diện sáng/tối (Theme) được lưu trong localStorage.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Quản lý cookie</h2>
            <p>
              Hầu hết các trình duyệt web đều tự động chấp nhận cookie. Bạn có thể thay đổi cài đặt trình duyệt để từ chối cookie hoặc hiển thị cảnh báo mỗi khi cookie được gửi đi. Tuy nhiên, việc tắt hoàn toàn cookie có thể làm giảm trải nghiệm hoặc ảnh hưởng đến khả năng duy trì phiên đăng nhập khi mua vé.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
