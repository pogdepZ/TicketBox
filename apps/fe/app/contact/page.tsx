"use client";

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Gửi lời nhắn thành công',
            message: 'Cảm ơn bạn! TicketBox đã tiếp nhận thông tin và sẽ phản hồi sớm nhất.',
            type: 'success',
          },
        })
      );
      setName('');
      setEmail('');
      setMessage('');
      setIsSubmitting(false);
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          Quay lại trang chủ
        </Link>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-12">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            Liên hệ
          </span>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl leading-[1.1]">
            Kết nối với TicketBox
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-[70ch]">
            Nếu bạn có bất kỳ câu hỏi nào về quy trình đặt vé hoặc có nhu cầu hợp tác tổ chức sự kiện, hãy liên hệ với chúng tôi.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Info Column */}
          <div className="space-y-8">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h3 className="text-xl font-bold text-foreground mb-6">Thông tin liên hệ</h3>
              
              <div className="space-y-5 text-muted-foreground text-sm">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Mail className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Email hỗ trợ</p>
                    <p className="mt-0.5">support@ticketbox.vn</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Phone className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Số điện thoại</p>
                    <p className="mt-0.5">1900 2026 (8:30 - 18:00 hàng ngày)</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Địa chỉ văn phòng</p>
                    <p className="mt-0.5">Tầng 12, Toà nhà Vietcombank, Quận 1, TP. Hồ Chí Minh</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/40 p-8">
              <h4 className="font-bold text-foreground mb-2">Hỗ trợ khẩn cấp</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Đối với các thắc mắc về đơn hàng cần xử lý ngay lập tức trước giờ diễn ra sự kiện, vui lòng gọi trực tiếp hotline hoặc truy cập trang Vé của tôi để lấy thông tin mã vé điện tử.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-6">Gửi tin nhắn cho chúng tôi</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Họ và tên</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="h-11 w-full rounded-full border border-border bg-background px-5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Địa chỉ Email</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-11 w-full rounded-full border border-border bg-background px-5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Nội dung</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Lời nhắn của bạn..."
                  className="w-full rounded-3xl border border-border bg-background p-5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/15 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-px transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="size-4" />
                    Gửi tin nhắn
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
