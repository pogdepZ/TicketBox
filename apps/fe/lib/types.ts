export type ConcertStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type TicketTypeStatus = 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'HIDDEN';
export type ReservationStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
export type OrderStatus = 'PENDING_PAYMENT' | 'PAYMENT_PROCESSING' | 'PAID' | 'PAYMENT_FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'WALLET';
export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED' | 'REFUNDED';

export type TicketZoneStatus = 'available' | 'limited' | 'sold-out';
export type SeatStatus = 'available' | 'selected' | 'sold' | 'held' | 'disabled';

export interface TicketZone {
  id: string;
  name: string;
  label: string;
  price: number;
  remaining: number;
  total: number;
  color: string;
  description: string;
  status: TicketZoneStatus;
  concertId?: string;
  seatZoneId?: string;
  ticketTypeId?: string;
  code?: string;
  maxPerUser?: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
  status: Exclude<SeatStatus, 'selected'>;
  zoneId: string;
  concertId?: string;
  seatZoneId?: string;
  ticketTypeId?: string;
}

export const paymentMethods = [
  {
    id: 'momo',
    gateway: 'WALLET' as PaymentMethod,
    name: 'Ví MoMo',
    description: 'Thanh toán nhanh qua ứng dụng MoMo',
    icon: 'Wallet',
  },
  {
    id: 'vnpay',
    gateway: 'WALLET' as PaymentMethod,
    name: 'VNPAY',
    description: 'Quét mã QR qua ứng dụng ngân hàng',
    icon: 'Building2',
  },
];
