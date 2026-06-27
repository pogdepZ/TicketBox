import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft, Rocket, Briefcase, Smile } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
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
            Cơ hội nghề nghiệp
          </span>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl leading-[1.1]">
            Kiến tạo tương lai của giải trí cùng TicketBox
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-[70ch]">
            Tại TicketBox, chúng tôi luôn tìm kiếm những tài năng trẻ, giàu nhiệt huyết và đam mê để cùng xây dựng nền tảng phân phối vé tốt nhất khu vực.
          </p>
        </div>

        <div className="space-y-6 mb-16">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex items-start gap-4">
            <Rocket className="size-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-foreground mb-1">Môi trường năng động</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nơi những ý tưởng sáng tạo được tôn trọng và thử nghiệm. Chúng tôi khuyến khích các sáng kiến đột phá và hỗ trợ tối đa để hiện thực hóa chúng.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex items-start gap-4">
            <Briefcase className="size-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-foreground mb-1">Chế độ đãi ngộ hấp dẫn</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mức lương cạnh tranh kèm theo các chính sách chăm sóc sức khoẻ toàn diện, thưởng hiệu suất công việc và trợ cấp vé xem các show diễn lớn hàng tháng.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex items-start gap-4">
            <Smile className="size-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-foreground mb-1">Cơ hội phát triển</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Được làm việc trực tiếp với các dự án công nghệ phức tạp và đối tác hàng đầu trong ngành công nghiệp âm nhạc và biểu diễn.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-12">
          <h2 className="text-2xl font-black text-foreground mb-6">Các vị trí đang tuyển dụng</h2>
          
          <div className="space-y-4">
            {[
              ['Frontend Engineer (React/Next.js)', 'TP. Hồ Chí Minh · Full-time', 'Xây dựng và tối ưu hoá giao diện đặt vé trực tuyến trên web và thiết bị di động.'],
              ['Backend Engineer (NestJS/Prisma)', 'TP. Hồ Chí Minh · Full-time', 'Phát triển hệ thống API, quản lý đặt chỗ theo thời gian thực và tích hợp cổng thanh toán.'],
              ['Customer Success Specialist', 'TP. Hồ Chí Minh · Full-time', 'Hỗ trợ khách hàng đặt vé và phối hợp kiểm soát cổng soát vé tại hiện trường sự kiện.'],
            ].map(([title, location, desc]) => (
              <div key={title} className="p-6 rounded-3xl border border-border bg-card shadow-sm hover:border-primary/30 transition group flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition">{title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">{location}</p>
                  <p className="text-sm text-muted-foreground max-w-xl">{desc}</p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-bold text-foreground hover:border-primary/40 hover:text-primary active:translate-y-px transition whitespace-nowrap self-start md:self-center"
                >
                  Ứng tuyển ngay
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
