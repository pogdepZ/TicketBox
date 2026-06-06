import { OrderSummary } from '@/components/checkout/OrderSummary';
import type { Seat, TicketZone } from '@/lib/mock-data';

interface CheckoutSummaryProps {
  concertTitle: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
  selectedSeats?: string[];
}

export function CheckoutSummary({
  concertTitle,
  ticketType,
  quantity,
  unitPrice,
  selectedSeats = [],
}: CheckoutSummaryProps) {
  const selectedZone: TicketZone = {
    id: ticketType.toLowerCase(),
    name: ticketType,
    label: 'Khu đã chọn',
    price: unitPrice,
    remaining: 0,
    total: 0,
    color: '#a78bfa',
    description: 'Thông tin vé đang được giữ cho đơn hàng này.',
    status: 'available',
  };

  const seats: Seat[] = selectedSeats.slice(0, quantity).map((label, index) => ({
    id: `${ticketType}-${label}-${index}`,
    row: label.replace(/\d/g, ''),
    number: Number(label.replace(/\D/g, '')) || index + 1,
    label,
    status: 'available',
    zoneId: selectedZone.id,
  }));

  return (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={selectedZone}
      selectedSeats={seats}
      primaryLabel="Tiếp tục thanh toán"
      primaryDisabled={false}
    />
  );
}
