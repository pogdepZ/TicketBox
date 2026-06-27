import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft, Landmark, Heart, Users } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
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

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            Về chúng tôi
          </span>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl leading-[1.1]">
            Chúng tôi định nghĩa lại cách bạn trải nghiệm âm nhạc
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-[70ch]">
            TicketBox là cổng đặt vé sự kiện âm nhạc và giải trí hàng đầu Việt Nam. Chúng tôi tin rằng mỗi tấm vé không chỉ là quyền vào cổng, mà còn là khởi đầu của một kỷ niệm khó quên.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <Users className="size-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Đồng hành cùng khán giả</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mang đến trải nghiệm đặt vé nhanh chóng, an toàn và dễ dàng với hệ thống giữ ghế thông minh.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <Heart className="size-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Kết nối cảm xúc</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cầu nối tin cậy giữa các nhà tổ chức sự kiện chuyên nghiệp và hàng triệu người hâm mộ yêu âm nhạc.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <Landmark className="size-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Nền tảng vững chắc</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Giải pháp công nghệ hiện đại bảo đảm giao dịch minh bạch, chống nạn vé giả và vé chợ đen đầu cơ.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-12">
          <h2 className="text-2xl font-black text-foreground mb-6">Sứ mệnh của TicketBox</h2>
          <div className="space-y-6 text-base text-muted-foreground leading-relaxed max-w-[75ch]">
            <p>
              Từ năm 2026, TicketBox không ngừng nâng cấp hệ thống đặt chỗ trực tuyến, tối ưu quy trình thanh toán nhằm mục tiêu tối giản hoá hành trình sở hữu vé sự kiện của người Việt Nam. Chúng tôi đồng hành cùng các đơn vị tổ chức từ khâu thiết kế sơ đồ ghế, cấu hình phân hạng vé cho đến vận hành hệ thống soát vé thông minh tại hiện trường sự kiện.
            </p>
            <p>
              Sự hài lòng và tin cậy của khách hàng là động lực lớn nhất giúp chúng tôi hoàn thiện mỗi ngày. Hãy cùng TicketBox khám phá và tận hưởng các show diễn bùng nổ sắp tới!
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
