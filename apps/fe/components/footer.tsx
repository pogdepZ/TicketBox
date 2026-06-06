import Link from 'next/link';
import { Code2, Heart, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              TicketBox
            </h3>
            <p className="text-sm text-muted-foreground">
              Nền tảng đặt vé dành cho concert, lễ hội âm nhạc và sự kiện biểu diễn tại Việt Nam.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Công ty</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition">Về chúng tôi</Link></li>
              <li><Link href="#" className="hover:text-primary transition">Liên hệ</Link></li>
              <li><Link href="#" className="hover:text-primary transition">Sự nghiệp</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Pháp lý</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition">Điều khoản</Link></li>
              <li><Link href="#" className="hover:text-primary transition">Chính sách</Link></li>
              <li><Link href="#" className="hover:text-primary transition">Cookie</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Theo dõi</h4>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition" aria-label="Kênh cộng đồng">
                <Code2 className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition" aria-label="Yêu thích">
                <Heart className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition" aria-label="Email">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2026 TicketBox. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
