import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConcertCard } from '@/components/concert-card';
import { concerts } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="relative h-96 bg-gradient-to-r from-primary/20 via-accent/20 to-purple-600/20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(167,139,250,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.15),transparent_50%)]" />
        </div>

        <div className="relative text-center max-w-3xl mx-auto px-4 z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
            Khám phá những sự kiện <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">đáng xem</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Đặt vé concert, lễ hội âm nhạc và các sân khấu biểu diễn nổi bật trong mùa hè 2026.
          </p>
          <button className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition">
            Bắt đầu khám phá
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Sự kiện nổi bật</h2>
          <p className="text-muted-foreground">Các buổi diễn đang được quan tâm nhất tuần này</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concerts.map((concert) => (
            <ConcertCard key={concert.id} {...concert} />
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary/10 to-accent/10 border-y border-border py-16 my-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">Không tìm thấy sự kiện bạn muốn?</h2>
          <p className="text-muted-foreground mb-8">Đăng ký để nhận thông báo khi có show mới được mở bán.</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Nhập email của bạn..."
              className="flex-1 px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition">
              Đăng ký
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
