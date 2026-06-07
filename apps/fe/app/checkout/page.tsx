import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <CheckoutFlow />
      <Footer />
    </main>
  );
}
