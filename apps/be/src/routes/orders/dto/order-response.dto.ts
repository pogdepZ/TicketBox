// Decimal is used via string conversion – no direct import needed

export interface OrderItemResponseDto {
  ticketTypeId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface OrderResponseDto {
  orderId: string;
  concertId: string;
  reservationId?: string;
  status: string;
  totalAmount: string;
  currency: 'VND';
  expiresAt: string;
  items: OrderItemResponseDto[];
}

export interface OrderDetailResponseDto extends OrderResponseDto {
  userId: string;
  reservationId: string;
  createdAt: string;
  paymentMethod?: string | null;
  paidAt?: string | null;
}

/**
 * Helper để chuyển Decimal/number → string an toàn.
 */
export function decimalToString(value: { toString(): string } | string | number): string {
  return value.toString();
}
