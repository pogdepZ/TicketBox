export interface TicketResponseDto {
  ticketId: string;
  ticketCode: string;
  ticketTypeName: string;
  qrPayload: string;
  seatNumber: string | null;
  status: string;
}

export interface PaymentStatusResponseDto {
  paymentRef: string;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  retryAction?: string;
  totalAmount: string;
  currency: 'VND';
  paidAt: string | null;
  expiresAt: string;
  tickets: TicketResponseDto[];
}
