import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
            Điều khoản dịch vụ
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Cập nhật lần cuối: 27/06/2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-6 text-sm leading-relaxed">
          <p>
            Chào mừng bạn đến với TicketBox. Bằng việc truy cập hoặc sử dụng trang web của chúng tôi, bạn đồng ý tuân thủ và chịu sự ràng buộc của các điều khoản dưới đây.
          </p>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Tài khoản người dùng</h2>
            <p>
              Khi đăng ký tài khoản tại TicketBox, bạn có trách nhiệm cung cấp thông tin chính xác, cập nhật đầy đủ và bảo mật mật khẩu của mình. Bạn hoàn toàn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của bạn.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Quy định đặt vé</h2>
            <p>
              Vé được phân phối qua TicketBox tuỳ thuộc vào tình trạng sẵn có. Một khi đơn hàng được xác nhận thanh toán thành công, vé điện tử (e-ticket) tương ứng với mã QR sẽ được gửi tới tài khoản của bạn. Vui lòng kiểm tra kỹ số lượng, hạng vé và thông tin sự kiện trước khi thanh toán.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Chính sách hoàn tiền và đổi trả</h2>
            <p>
              Theo quy định chung của các sự kiện biểu diễn, vé đã mua thành công không được phép hoàn trả tiền hoặc đổi lại trừ khi sự kiện bị hoãn hoặc huỷ từ phía đơn vị tổ chức. Trong trường hợp hoãn hoặc huỷ, quy trình hoàn trả tiền vé sẽ được thực hiện theo đúng thông báo chính thức của Ban tổ chức.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Sử dụng mã QR và bảo mật vé</h2>
            <p>
              Mỗi mã QR trên vé điện tử đại diện cho một quyền check-in tại cổng sự kiện. Bạn có trách nhiệm tự bảo mật mã QR này. TicketBox sẽ không chịu trách nhiệm trong trường hợp mã QR bị chia sẻ trái phép hoặc bị quét trước do sự bất cẩn của chủ sở hữu vé.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Giới hạn trách nhiệm</h2>
            <p>
              TicketBox đóng vai trò là nền tảng phân phối vé trực tuyến. Mọi vấn đề liên quan trực tiếp đến chất lượng biểu diễn, an ninh, sơ đồ chỗ ngồi hoặc thay đổi danh sách nghệ sĩ biểu diễn thuộc trách nhiệm hoàn toàn của Ban tổ chức sự kiện tương ứng.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
