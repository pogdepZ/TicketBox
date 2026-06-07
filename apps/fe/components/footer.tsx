import Link from 'next/link';
import { Code2, Heart, Mail, Ticket } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3 text-lg font-black">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Ticket className="size-5" />
              </span>
              TicketBox
            </div>
            <p className="max-w-xs text-sm leading-6 text-background/65">
              Nền tảng đặt vé dành cho concert, lễ hội âm nhạc và sự kiện biểu diễn tại Việt Nam.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-background">Công ty</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="#" className="transition hover:text-primary">Về chúng tôi</Link></li>
              <li><Link href="#" className="transition hover:text-primary">Liên hệ</Link></li>
              <li><Link href="#" className="transition hover:text-primary">Sự nghiệp</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-background">Pháp lý</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="#" className="transition hover:text-primary">Điều khoản</Link></li>
              <li><Link href="#" className="transition hover:text-primary">Chính sách</Link></li>
              <li><Link href="#" className="transition hover:text-primary">Cookie</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-background">Theo dõi</h4>
            <div className="flex gap-4">
              <a href="#" className="grid size-10 place-items-center rounded-full border border-background/15 text-background/65 transition hover:border-primary hover:text-primary" aria-label="Kênh cộng đồng">
                <Code2 className="size-5" />
              </a>
              <a href="#" className="grid size-10 place-items-center rounded-full border border-background/15 text-background/65 transition hover:border-primary hover:text-primary" aria-label="Yêu thích">
                <Heart className="size-5" />
              </a>
              <a href="#" className="grid size-10 place-items-center rounded-full border border-background/15 text-background/65 transition hover:border-primary hover:text-primary" aria-label="Email">
                <Mail className="size-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8 text-center text-sm text-background/50">
          <p>&copy; 2026 TicketBox. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
