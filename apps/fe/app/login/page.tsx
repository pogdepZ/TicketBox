import { AuthForm } from '@/components/auth-form';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto flex max-w-7xl items-center justify-center px-4 py-16">
        <AuthForm mode="login" />
      </section>
      <Footer />
    </main>
  );
}
