import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
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
            Chính sách bảo mật
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Cập nhật lần cuối: 27/06/2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-6 text-sm leading-relaxed">
          <p>
            Tại TicketBox, sự riêng tư của người dùng là ưu tiên hàng đầu của chúng tôi. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, chia sẻ và bảo vệ thông tin cá nhân của bạn khi sử dụng dịch vụ của chúng tôi.
          </p>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Thông tin chúng tôi thu thập</h2>
            <p>
              Chúng tôi thu thập các thông tin cá nhân mà bạn cung cấp trực tiếp khi đăng ký tài khoản, đăng ký nhận bản tin hoặc mua vé, bao gồm: Họ và tên, Địa chỉ Email, Số điện thoại và Lịch sử mua vé của bạn.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Cách sử dụng thông tin</h2>
            <p>
              Thông tin thu thập được sử dụng để: xử lý đơn hàng đặt vé, hiển thị thông tin e-ticket trong tài khoản của bạn, gửi thông báo thay đổi lịch trình sự kiện khẩn cấp và cải thiện chất lượng dịch vụ của hệ thống.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Chia sẻ thông tin</h2>
            <p>
              TicketBox chỉ chia sẻ thông tin cần thiết (như danh sách khách hàng đặt vé) cho Ban tổ chức sự kiện cụ thể mà bạn đã đặt vé để hỗ trợ kiểm soát cửa soát vé và xử lý các vấn đề phát sinh. Chúng tôi cam kết không bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị thương mại.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Bảo mật dữ liệu</h2>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật công nghệ thích hợp để bảo vệ thông tin cá nhân của bạn trước việc truy cập trái phép, sửa đổi hoặc tiết lộ thông tin ngoài ý muốn. Tuy nhiên, không có phương thức truyền thông tin qua internet nào là an toàn 100%.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Quyền lợi của bạn</h2>
            <p>
              Bạn có quyền yêu cầu truy cập, sửa đổi thông tin cá nhân của mình bất kỳ lúc nào bằng cách truy cập tài khoản trực tuyến hoặc liên hệ trực tiếp với bộ phận chăm sóc khách hàng của TicketBox.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
