import type { Seat, TicketZone } from '@/lib/mock-data';

export const DRAFT_RESERVATION_KEY = 'ticketbox-draft-reservation';
export const MOCK_ORDERS_KEY = 'ticketbox-mock-orders';

export interface DraftReservation {
  id: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  status: 'HELD';
  expiresAt: string;
  createdAt: string;
  item: {
    id: string;
    ticketTypeId: string;
    seatZoneId: string;
    zoneId: string;
    zoneName: string;
    zoneLabel: string;
    zoneColor: string;
    quantity: number;
    unitPrice: number;
    seatLabels: string[];
  };
}

export interface StoredMockTicket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketCode: string;
  qrPayload: string;
  seatZone: string;
  seatNumber: string;
  price: number;
  status: 'ACTIVE';
  createdAt: string;
}

export interface StoredMockOrder {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  reservationId: string;
  status: 'PAID';
  totalAmount: number;
  paymentMethod: string;
  paidAt: string;
  createdAt: string;
  expiresAt: string;
  items: Array<{
    id: string;
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
    seatLabels: string[];
  }>;
  tickets: StoredMockTicket[];
}

export function createDraftReservation(input: {
  concertId: string;
  concertTitle: string;
  selectedZone: TicketZone;
  selectedSeats: Seat[];
}): DraftReservation {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
  const reservationId = `reservation-${input.concertId}-${createdAt.getTime()}`;

  const draft: DraftReservation = {
    id: reservationId,
    userId: 'user-minh-anh',
    concertId: input.concertId,
    concertTitle: input.concertTitle,
    status: 'HELD',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    item: {
      id: `reservation-item-${reservationId}`,
      ticketTypeId: input.selectedZone.ticketTypeId ?? input.selectedZone.id,
      seatZoneId: input.selectedZone.seatZoneId ?? input.selectedZone.id,
      zoneId: input.selectedZone.id,
      zoneName: input.selectedZone.name,
      zoneLabel: input.selectedZone.label,
      zoneColor: input.selectedZone.color,
      quantity: input.selectedSeats.length,
      unitPrice: input.selectedZone.price,
      seatLabels: input.selectedSeats.map((seat) => seat.label),
    },
  };

  window.localStorage.setItem(DRAFT_RESERVATION_KEY, JSON.stringify(draft));
  return draft;
}

export function getDraftReservation(): DraftReservation | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(DRAFT_RESERVATION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as DraftReservation;
  } catch {
    window.localStorage.removeItem(DRAFT_RESERVATION_KEY);
    return null;
  }
}

export function getStoredMockOrders(): StoredMockOrder[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem(MOCK_ORDERS_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as StoredMockOrder[];
  } catch {
    window.localStorage.removeItem(MOCK_ORDERS_KEY);
    return [];
  }
}

export function getStoredMockOrder(orderId: string): StoredMockOrder | null {
  return getStoredMockOrders().find((order) => order.id === orderId) ?? null;
}

export function createMockOrderFromDraft(input: {
  draft: DraftReservation;
  paymentMethod: string;
}): StoredMockOrder {
  const paidAt = new Date();
  const subtotal = input.draft.item.quantity * input.draft.item.unitPrice;
  const totalAmount = subtotal + Math.round(subtotal * 0.05) + Math.round(subtotal * 0.1);
  const orderId = `order-${input.draft.concertId}-${paidAt.getTime()}`;
  const orderNumber = `ORD-${paidAt.getFullYear()}-${String(paidAt.getTime()).slice(-6)}`;

  const tickets = input.draft.item.seatLabels.map((seatLabel, index) => {
    const ticketCode = `TBX-${paidAt.getFullYear()}-${String(paidAt.getTime()).slice(-5)}${index + 1}`;

    return {
      id: `ticket-${orderId}-${index + 1}`,
      orderId,
      ticketTypeId: input.draft.item.ticketTypeId,
      ticketCode,
      qrPayload: `mock-qr:${ticketCode}:${input.draft.concertId}:${input.draft.item.ticketTypeId}`,
      seatZone: `${input.draft.item.zoneName} / ${input.draft.item.zoneLabel}`,
      seatNumber: seatLabel,
      price: input.draft.item.unitPrice,
      status: 'ACTIVE' as const,
      createdAt: paidAt.toISOString(),
    };
  });

  const order: StoredMockOrder = {
    id: orderId,
    orderNumber,
    userId: input.draft.userId,
    concertId: input.draft.concertId,
    concertTitle: input.draft.concertTitle,
    reservationId: input.draft.id,
    status: 'PAID',
    totalAmount,
    paymentMethod: input.paymentMethod,
    paidAt: paidAt.toISOString(),
    createdAt: paidAt.toISOString(),
    expiresAt: input.draft.expiresAt,
    items: [
      {
        id: `order-item-${orderId}`,
        ticketTypeId: input.draft.item.ticketTypeId,
        quantity: input.draft.item.quantity,
        unitPrice: input.draft.item.unitPrice,
        seatLabels: input.draft.item.seatLabels,
      },
    ],
    tickets,
  };

  window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify([...getStoredMockOrders(), order]));
  window.localStorage.removeItem(DRAFT_RESERVATION_KEY);
  return order;
}
