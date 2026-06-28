import type { Seat, TicketZone } from '@/lib/types';

export const DRAFT_RESERVATION_KEY = 'ticketbox-draft-reservation';
export const MOCK_ORDERS_KEY = 'ticketbox-mock-orders';

export interface DraftReservationItem {
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
}

export interface DraftReservation {
  id: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  status: 'HELD';
  expiresAt: string;
  createdAt: string;
  items: DraftReservationItem[];
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
  concertVenue?: string;
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
  zones: TicketZone[];
  selectedSeats: Seat[];
}): DraftReservation {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + (10 * 60 + 10) * 1000);
  const reservationId = `reservation-${input.concertId}-${createdAt.getTime()}`;

  // Gom nhóm selectedSeats theo ticketTypeId (hoặc zoneId)
  const seatsByZoneMap = new Map<string, Seat[]>();
  input.selectedSeats.forEach((seat) => {
    const zoneId = seat.zoneId || seat.seatZoneId || '';
    if (zoneId) {
      const current = seatsByZoneMap.get(zoneId) || [];
      seatsByZoneMap.set(zoneId, [...current, seat]);
    }
  });

  const items: DraftReservationItem[] = Array.from(seatsByZoneMap.entries()).map(([zoneId, seats], index) => {
    const zone = input.zones.find((z) => z.id === zoneId) || input.zones[0];
    return {
      id: `reservation-item-${reservationId}-${index}`,
      ticketTypeId: zone.ticketTypeId ?? zone.id,
      seatZoneId: zone.seatZoneId ?? zone.id,
      zoneId: zone.id,
      zoneName: zone.name,
      zoneLabel: zone.label,
      zoneColor: zone.color,
      quantity: seats.length,
      unitPrice: zone.price,
      seatLabels: seats.map((s) => s.label),
    };
  });

  const draft: DraftReservation = {
    id: reservationId,
    userId: 'user-minh-anh',
    concertId: input.concertId,
    concertTitle: input.concertTitle,
    status: 'HELD',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    items,
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
  orderId?: string;
}): StoredMockOrder {
  const paidAt = new Date();
  const totalAmount = input.draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const orderId = input.orderId || `order-${input.draft.concertId}-${paidAt.getTime()}`;
  const orderNumber = `ORD-${paidAt.getFullYear()}-${String(paidAt.getTime()).slice(-6)}`;

  const tickets: StoredMockTicket[] = [];
  input.draft.items.forEach((item) => {
    item.seatLabels.forEach((seatLabel, index) => {
      const ticketCode = `TBX-${paidAt.getFullYear()}-${String(paidAt.getTime()).slice(-5)}${tickets.length + 1}`;
      tickets.push({
        id: `ticket-${orderId}-${tickets.length + 1}`,
        orderId,
        ticketTypeId: item.ticketTypeId,
        ticketCode,
        qrPayload: `mock-qr:${ticketCode}:${input.draft.concertId}:${item.ticketTypeId}`,
        seatZone: item.zoneName,
        seatNumber: seatLabel,
        price: item.unitPrice,
        status: 'ACTIVE' as const,
        createdAt: paidAt.toISOString(),
      });
    });
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
    items: input.draft.items.map((item) => ({
      id: item.id,
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      seatLabels: item.seatLabels,
    })),
    tickets,
  };

  window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify([...getStoredMockOrders(), order]));
  window.localStorage.removeItem(DRAFT_RESERVATION_KEY);
  return order;
}
