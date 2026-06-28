import { OrderSummary } from '@/components/checkout/OrderSummary';
import type { Seat, TicketZone } from '@/lib/types';

interface CheckoutSummaryProps {
  concertTitle: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
  selectedSeats?: string[];
  items?: any[];
}

export function CheckoutSummary({
  concertTitle,
  ticketType,
  quantity,
  unitPrice,
  selectedSeats = [],
  items = [],
}: CheckoutSummaryProps) {
  // Nếu có danh sách items thực tế từ backend, ta map động các zone
  const zones: TicketZone[] = items.length > 0
    ? items.map((item, idx) => ({
        id: item.ticketTypeId || String(idx),
        name: item.name || ticketType,
        label: item.name || ticketType,
        price: Number(item.unitPrice),
        remaining: 0,
        total: 0,
        color: ['#e5484d', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'][idx % 5],
        description: '',
        status: 'available',
      }))
    : [{
        id: ticketType.toLowerCase(),
        name: ticketType,
        label: 'Khu đã chọn',
        price: unitPrice,
        remaining: 0,
        total: 0,
        color: '#e5484d',
        description: 'Thông tin vé đang được giữ cho đơn hàng này.',
        status: 'available',
      }];

  // Map danh sách ghế phẳng sang Seat[] có liên kết zoneId chuẩn xác
  const seats: Seat[] = [];
  if (items.length > 0) {
    let seatIdx = 0;
    items.forEach((item, zoneIdx) => {
      const zone = zones[zoneIdx];
      for (let i = 0; i < item.quantity; i++) {
        const label = selectedSeats[seatIdx] || `Ghế ${i + 1}`;
        seats.push({
          id: `${zone.id}-${label}-${i}-${seatIdx}`,
          row: label.replace(/\d/g, ''),
          number: Number(label.replace(/\D/g, '')) || i + 1,
          label,
          status: 'available',
          zoneId: zone.id,
        });
        seatIdx++;
      }
    });
  } else {
    selectedSeats.slice(0, quantity).map((label, index) => {
      const zone = zones[0];
      seats.push({
        id: `${zone.id}-${label}-${index}`,
        row: label.replace(/\d/g, ''),
        number: Number(label.replace(/\D/g, '')) || index + 1,
        label,
        status: 'available',
        zoneId: zone.id,
      });
    });
  }

  return (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={zones[0]}
      selectedSeats={seats}
      primaryLabel="Tiếp tục thanh toán"
      primaryDisabled={false}
      zones={zones}
    />
  );
}
