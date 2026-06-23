import { AuthForm } from '@/components/auth-form';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto flex max-w-7xl items-center justify-center px-4 py-16">
        <Suspense fallback={
          <div className="h-96 flex items-center justify-center">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <AuthForm mode="login" />
        </Suspense>
      </section>
      <Footer />
    </main>
  );
}
