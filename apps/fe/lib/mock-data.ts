export type ConcertStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type TicketTypeStatus = 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'HIDDEN';
export type ReservationStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
export type OrderStatus = 'PENDING_PAYMENT' | 'PAYMENT_PROCESSING' | 'PAID' | 'PAYMENT_FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'WALLET';
export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED' | 'REFUNDED';

export type TicketZoneStatus = 'available' | 'limited' | 'sold-out';
export type SeatStatus = 'available' | 'selected' | 'sold' | 'held' | 'disabled';

export interface MockConcert {
  id: string;
  name: string;
  description: string;
  artistName: string;
  venueName: string;
  venueAddress: string;
  city: string;
  eventDate: string;
  posterUrl: string;
  status: ConcertStatus;
  genre: string;
  language: string;
  ageLimit: string;
  capacity: number;
  ticketsSold: number;
  revenue: number;
}

export interface MockSeatZone {
  id: string;
  concertId: string;
  code: string;
  name: string;
  label: string;
  color: string;
  description: string;
}

export interface MockTicketType {
  id: string;
  concertId: string;
  seatZoneId: string;
  name: string;
  price: number;
  totalQuantity: number;
  remaining: number;
  maxPerUser: number;
  status: TicketTypeStatus;
}

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

export interface MockReservationItem {
  id: string;
  reservationId: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  seatLabels: string[];
}

export interface MockReservation {
  id: string;
  userId: string;
  concertId: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  items: MockReservationItem[];
}

export interface MockOrderItem {
  id: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  seatLabels: string[];
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  reservationId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
  items: MockOrderItem[];
}

export interface MockTicket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ownerUserId: string;
  ticketCode: string;
  qrPayload: string;
  seatNumber: string;
  status: TicketStatus;
  createdAt: string;
}

export interface MockUser {
  id: string;
  fullName: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 'user-minh-anh',
    fullName: 'Nguyễn Minh Anh',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    phone: '090 123 4567',
    role: 'Khách hàng',
  },
  {
    id: 'admin-1',
    fullName: 'Quản trị TicketBox',
    name: 'Quản trị TicketBox',
    email: 'admin@ticketbox.vn',
    phone: '090 000 0000',
    password: 'admin123',
    role: 'Quản trị viên',
  },
];

export const mockConcerts: MockConcert[] = [
  {
    id: '1',
    name: 'Đêm Nhạc Ánh Sao',
    artistName: 'Hà Anh Tuấn',
    eventDate: '2026-07-18T19:30:00+07:00',
    venueName: 'Nhà hát Hòa Bình',
    venueAddress: '240 Đường 3/2, Quận 10',
    city: 'TP. Hồ Chí Minh',
    posterUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=700&fit=crop',
    description: 'Một đêm diễn giàu cảm xúc với dàn nhạc live, sân khấu ánh sáng hiện đại và những bản ballad được phối mới dành riêng cho khán giả Sài Gòn.',
    status: 'PUBLISHED',
    genre: 'Pop Ballad',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    capacity: 2400,
    ticketsSold: 1860,
    revenue: 1581000000,
  },
  {
    id: '2',
    name: 'Electric Summer Festival',
    artistName: 'DJ Mie, Wukong, Touliver',
    eventDate: '2026-07-25T20:00:00+07:00',
    venueName: 'Công viên Yên Sở',
    venueAddress: 'Hoàng Mai',
    city: 'Hà Nội',
    posterUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&h=700&fit=crop',
    description: 'Lễ hội EDM ngoài trời với ba sân khấu, khu ẩm thực, hiệu ứng visual 3D và line-up DJ Việt Nam lẫn quốc tế cho mùa hè 2026.',
    status: 'PUBLISHED',
    genre: 'EDM',
    language: 'Tiếng Việt / English',
    ageLimit: '18+',
    capacity: 12000,
    ticketsSold: 8200,
    revenue: 5330000000,
  },
  {
    id: '3',
    name: 'Jazz By The River',
    artistName: 'Saigon Blue Notes',
    eventDate: '2026-08-02T20:30:00+07:00',
    venueName: 'Bến Bạch Đằng',
    venueAddress: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    posterUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&h=700&fit=crop',
    description: 'Không gian jazz thân mật bên sông với saxophone, piano trio và các bản standard kinh điển được trình diễn trong khung cảnh thành phố về đêm.',
    status: 'PUBLISHED',
    genre: 'Jazz',
    language: 'Instrumental',
    ageLimit: '16+',
    capacity: 680,
    ticketsSold: 512,
    revenue: 215040000,
  },
  {
    id: '4',
    name: 'Rock Việt Trở Lại',
    artistName: 'Bức Tường Tribute Band',
    eventDate: '2026-08-15T19:00:00+07:00',
    venueName: 'Cung Thể thao Tiên Sơn',
    venueAddress: 'Hải Châu',
    city: 'Đà Nẵng',
    posterUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&h=700&fit=crop',
    description: 'Đêm rock bùng nổ với những ca khúc gắn liền nhiều thế hệ, hệ thống âm thanh lớn và khu standing dành cho fan muốn hòa mình vào sân khấu.',
    status: 'PUBLISHED',
    genre: 'Rock',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    capacity: 5200,
    ticketsSold: 3940,
    revenue: 1970000000,
  },
  {
    id: '5',
    name: 'Indie Night: Thành Phố Mơ',
    artistName: 'Vũ., Ngọt, Chillies',
    eventDate: '2026-08-29T19:45:00+07:00',
    venueName: 'SECC Hall B',
    venueAddress: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    posterUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&h=700&fit=crop',
    description: 'Ba màu sắc indie Việt trên cùng một sân khấu, kết hợp không gian visual tối giản, khu merch và trải nghiệm check-in dành cho cộng đồng fan.',
    status: 'PUBLISHED',
    genre: 'Indie',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    capacity: 7000,
    ticketsSold: 6100,
    revenue: 4392000000,
  },
  {
    id: '6',
    name: 'Classical Morning',
    artistName: 'Vietnam National Symphony Orchestra',
    eventDate: '2026-09-06T10:00:00+07:00',
    venueName: 'Nhà hát Lớn Hà Nội',
    venueAddress: 'Hoàn Kiếm',
    city: 'Hà Nội',
    posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=900&h=700&fit=crop',
    description: 'Buổi hòa nhạc buổi sáng với các tác phẩm Mozart, Tchaikovsky và phần giao lưu ngắn cùng nhạc trưởng sau chương trình.',
    status: 'PUBLISHED',
    genre: 'Classical',
    language: 'Instrumental',
    ageLimit: '8+',
    capacity: 900,
    ticketsSold: 900,
    revenue: 342000000,
  },
];

const zoneTemplates = [
  {
    code: 'svip',
    name: 'SVIP',
    label: 'Khu A',
    price: 1250000,
    totalQuantity: 160,
    remaining: 18,
    color: '#e5484d',
    description: 'Khu trung tâm gần sân khấu nhất, tầm nhìn trực diện và lối vào ưu tiên.',
  },
  {
    code: 'vip',
    name: 'VIP',
    label: 'Khu B',
    price: 850000,
    totalQuantity: 260,
    remaining: 76,
    color: '#e0a82e',
    description: 'Khu ghế phía trước hai cánh, phù hợp khán giả muốn trải nghiệm sân khấu gần.',
  },
  {
    code: 'premium',
    name: 'CAT1',
    label: 'Khu C',
    price: 650000,
    totalQuantity: 420,
    remaining: 124,
    color: '#3d6f8f',
    description: 'Khu trung tâm tầng dưới, cân bằng giữa tầm nhìn, âm thanh và giá vé.',
  },
  {
    code: 'standard',
    name: 'CAT2',
    label: 'Khu D',
    price: 420000,
    totalQuantity: 760,
    remaining: 310,
    color: '#123c3a',
    description: 'Khu ghế tiêu chuẩn phía sau, dễ đi theo nhóm và vẫn nhìn rõ toàn cảnh sân khấu.',
  },
  {
    code: 'economy',
    name: 'GA',
    label: 'Khu E',
    price: 250000,
    totalQuantity: 540,
    remaining: 145,
    color: '#64748b',
    description: 'Khu vực General Admission (GA) tự do sôi động, gần gũi với không khí lễ hội.',
  },
] as const;

const concertTicketOverrides: Record<string, Partial<Record<string, { price?: number; totalQuantity?: number; remaining?: number }>>> = {
  '2': {
    svip: { price: 1800000, totalQuantity: 240, remaining: 42 },
    vip: { price: 1200000, totalQuantity: 680, remaining: 180 },
    premium: { price: 850000, totalQuantity: 1800, remaining: 620 },
    standard: { price: 550000, totalQuantity: 5200, remaining: 2100 },
    economy: { price: 350000, totalQuantity: 4080, remaining: 1260 },
  },
  '3': {
    svip: { price: 950000, totalQuantity: 48, remaining: 4 },
    vip: { price: 720000, totalQuantity: 96, remaining: 9 },
    premium: { price: 520000, totalQuantity: 180, remaining: 28 },
    standard: { price: 350000, totalQuantity: 260, remaining: 64 },
    economy: { price: 220000, totalQuantity: 96, remaining: 0 },
  },
  '4': {
    svip: { price: 900000, totalQuantity: 120, remaining: 31 },
    vip: { price: 700000, totalQuantity: 420, remaining: 115 },
    premium: { price: 520000, totalQuantity: 980, remaining: 240 },
    standard: { price: 390000, totalQuantity: 2400, remaining: 720 },
    economy: { price: 250000, totalQuantity: 1280, remaining: 418 },
  },
  '5': {
    svip: { price: 1500000, totalQuantity: 180, remaining: 8 },
    vip: { price: 1050000, totalQuantity: 520, remaining: 38 },
    premium: { price: 780000, totalQuantity: 1400, remaining: 210 },
    standard: { price: 520000, totalQuantity: 3300, remaining: 520 },
    economy: { price: 320000, totalQuantity: 1600, remaining: 0 },
  },
  '6': {
    svip: { price: 780000, totalQuantity: 80, remaining: 0 },
    vip: { price: 620000, totalQuantity: 160, remaining: 0 },
    premium: { price: 480000, totalQuantity: 260, remaining: 0 },
    standard: { price: 320000, totalQuantity: 300, remaining: 0 },
    economy: { price: 180000, totalQuantity: 100, remaining: 0 },
  },
};

const concertZoneDescriptions: Record<string, Partial<Record<string, string>>> = {
  '2': {
    svip: 'Khu fanpit sát main stage, có lối check-in riêng cho festival ngoài trời.',
    premium: 'Khu trung tâm cân bằng giữa sân khấu chính, khu food court và màn hình LED phụ.',
    economy: 'Khu phổ thông sức chứa lớn, phù hợp đi theo nhóm đông trong festival.',
  },
  '3': {
    svip: 'Bàn ghế gần sân khấu jazz, không gian nhỏ nên số lượng rất giới hạn.',
    vip: 'Khu gần ban nhạc, phù hợp khán giả muốn nghe rõ saxophone và piano trio.',
    economy: 'Khu tiết kiệm đã hết vé vì venue có sức chứa nhỏ.',
  },
  '5': {
    svip: 'Khu gần sân khấu và khu merch, số lượng còn rất ít.',
    vip: 'Tầm nhìn đẹp cho line-up indie, đang gần hết vé.',
    economy: 'Khu tiết kiệm đã bán hết trong đợt mở bán đầu.',
  },
  '6': {
    svip: 'Hạng ghế trung tâm nhà hát đã bán hết.',
    vip: 'Hạng ghế tầng trệt đã bán hết.',
    premium: 'Hạng ghế ban công đã bán hết.',
    standard: 'Hạng ghế tiêu chuẩn đã bán hết.',
    economy: 'Toàn bộ vé Classical Morning đã bán hết.',
  },
};

export const mockSeatZones: MockSeatZone[] = mockConcerts.flatMap((concert) =>
  zoneTemplates.map((zone) => ({
    id: `seat-zone-${concert.id}-${zone.code}`,
    concertId: concert.id,
    code: zone.code,
    name: zone.name,
    label: zone.label,
    color: zone.color,
    description: concertZoneDescriptions[concert.id]?.[zone.code] ?? zone.description,
  })),
);

export const mockTicketTypes: MockTicketType[] = mockSeatZones.map((seatZone) => {
  const template = zoneTemplates.find((zone) => zone.code === seatZone.code)!;
  const override = concertTicketOverrides[seatZone.concertId]?.[seatZone.code];
  const remaining = override?.remaining ?? template.remaining;

  return {
    id: `ticket-type-${seatZone.concertId}-${seatZone.code}`,
    concertId: seatZone.concertId,
    seatZoneId: seatZone.id,
    name: template.name,
    price: override?.price ?? template.price,
    totalQuantity: override?.totalQuantity ?? template.totalQuantity,
    remaining,
    maxPerUser: 4,
    status: remaining === 0 ? 'SOLD_OUT' : 'ACTIVE',
  };
});

function toTicketZoneStatus(ticketType: MockTicketType): TicketZoneStatus {
  if (ticketType.status === 'SOLD_OUT' || ticketType.remaining === 0) {
    return 'sold-out';
  }

  return ticketType.remaining / ticketType.totalQuantity <= 0.15 ? 'limited' : 'available';
}

export function getTicketZonesByConcertId(concertId: string): TicketZone[] {
  const effectiveId = ['1', '2', '3', '4', '5', '6'].includes(concertId) ? concertId : '1';
  return mockTicketTypes
    .filter((ticketType) => ticketType.concertId === effectiveId && ticketType.status !== 'HIDDEN')
    .map((ticketType) => {
      const seatZone = mockSeatZones.find((zone) => zone.id === ticketType.seatZoneId)!;

      return {
        id: seatZone.code,
        name: seatZone.name,
        label: seatZone.label,
        price: ticketType.price,
        remaining: ticketType.remaining,
        total: ticketType.totalQuantity,
        color: seatZone.color,
        description: seatZone.description,
        status: toTicketZoneStatus(ticketType),
        concertId,
        seatZoneId: seatZone.id,
        ticketTypeId: ticketType.id,
        code: seatZone.code,
      };
    });
}

function createZoneSeats(concertId: string, zoneCode: string, rowNames: string[], seatsPerRow: number): Seat[] {
  const effectiveConcertId = ['1', '2', '3', '4', '5', '6'].includes(concertId) ? concertId : '1';
  const seatZone = mockSeatZones.find((zone) => zone.concertId === effectiveConcertId && zone.code === zoneCode)!;
  const ticketType = mockTicketTypes.find(
    (tt) => tt.concertId === effectiveConcertId && tt.seatZoneId === seatZone.id
  );
  const remaining = ticketType ? ticketType.remaining : 0;
  const seats: Seat[] = [];

  let availablePlaced = 0;

  rowNames.forEach((row, rowIndex) => {
    for (let number = 1; number <= seatsPerRow; number += 1) {
      let status: 'disabled' | 'sold' | 'held' | 'available' = 'available';
      if (availablePlaced < remaining) {
        status = 'available';
        availablePlaced++;
      } else {
        // Distribute some held and some sold to look natural
        status = (rowIndex + number) % 7 === 0 ? 'held' : 'sold';
      }

      seats.push({
        id: `seat-${concertId}-${zoneCode}-${row}-${number}`,
        row,
        number,
        label: `${row}${number.toString().padStart(2, '0')}`,
        status,
        zoneId: zoneCode,
        concertId,
        seatZoneId: seatZone.id,
      });
    }
  });

  return seats;
}

export function getSeatsByConcertId(concertId: string): Seat[] {
  return [
    ...createZoneSeats(concertId, 'svip', ['A', 'B', 'C', 'D', 'E', 'F'], 16),
    ...createZoneSeats(concertId, 'vip', ['G', 'H', 'I', 'J', 'K', 'L', 'M'], 18),
    ...createZoneSeats(concertId, 'premium', ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'], 20),
    ...createZoneSeats(concertId, 'standard', ['V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC'], 22),
    ...createZoneSeats(concertId, 'economy', ['AD', 'AE', 'AF', 'AG', 'AH', 'AI'], 24),
  ];
}

function getTimeFromEventDate(eventDate: string): string {
  return new Date(eventDate).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getLowestPrice(concertId: string): number {
  const effectiveId = ['1', '2', '3', '4', '5', '6'].includes(concertId) ? concertId : '1';
  return Math.min(
    ...mockTicketTypes
      .filter((ticketType) => ticketType.concertId === effectiveId)
      .map((ticketType) => ticketType.price),
  );
}

function isConcertSoldOut(concertId: string): boolean {
  const effectiveId = ['1', '2', '3', '4', '5', '6'].includes(concertId) ? concertId : '1';
  return mockTicketTypes
    .filter((ticketType) => ticketType.concertId === effectiveId)
    .every((ticketType) => ticketType.status === 'SOLD_OUT' || ticketType.remaining === 0);
}

function toDisplayStatus(concert: MockConcert): string {
  if (concert.status === 'CANCELLED') return 'Đã hủy';
  if (concert.status === 'COMPLETED') return 'Đã kết thúc';
  if (isConcertSoldOut(concert.id)) return 'Hết vé';
  if (concert.capacity - concert.ticketsSold <= concert.capacity * 0.2) return 'Sắp hết vé';
  return 'Đang bán';
}

export const concerts = mockConcerts.map((concert) => ({
  id: concert.id,
  title: concert.name,
  artist: concert.artistName,
  date: concert.eventDate,
  time: getTimeFromEventDate(concert.eventDate),
  venue: concert.venueName,
  city: concert.city,
  image: concert.posterUrl,
  description: concert.description,
  price: getLowestPrice(concert.id),
  capacity: concert.capacity,
  soldOut: isConcertSoldOut(concert.id),
  genre: concert.genre,
  language: concert.language,
  ageLimit: concert.ageLimit,
  ticketsSold: concert.ticketsSold,
  revenue: concert.revenue,
  status: toDisplayStatus(concert),
}));

export const ticketZones: TicketZone[] = getTicketZonesByConcertId('1');

export const ticketTypes = ticketZones.map((zone) => ({
  id: zone.ticketTypeId ?? zone.id,
  name: zone.name,
  price: zone.price,
  description: zone.description,
  available: zone.remaining,
}));

export const seatZones = ticketZones.map((zone) => ({
  id: zone.seatZoneId ?? zone.id,
  name: zone.name,
  rows: 8,
  seatsPerRow: 18,
  price: zone.price,
  color: zone.color,
}));

export const seats: Seat[] = getSeatsByConcertId('1');

export const mockReservations: MockReservation[] = [
  {
    id: 'reservation-demo-1',
    userId: 'user-minh-anh',
    concertId: '1',
    status: 'HELD',
    expiresAt: '2026-06-07T20:15:00+07:00',
    createdAt: '2026-06-07T20:00:00+07:00',
    items: [
      {
        id: 'reservation-item-demo-1',
        reservationId: 'reservation-demo-1',
        ticketTypeId: 'ticket-type-1-vip',
        quantity: 2,
        unitPrice: 850000,
        seatLabels: ['G07', 'G08'],
      },
    ],
  },
];

export const mockOrders: MockOrder[] = [
  {
    id: 'order-demo-1',
    orderNumber: 'ORD-2026-07018',
    userId: 'user-minh-anh',
    concertId: '1',
    reservationId: 'reservation-demo-1',
    status: 'PAID',
    totalAmount: 1955000,
    paymentMethod: 'CARD',
    paidAt: '2026-06-07T20:05:00+07:00',
    expiresAt: '2026-06-07T20:15:00+07:00',
    createdAt: '2026-06-07T20:00:00+07:00',
    items: [
      {
        id: 'order-item-demo-1',
        orderId: 'order-demo-1',
        ticketTypeId: 'ticket-type-1-vip',
        quantity: 2,
        unitPrice: 850000,
        seatLabels: ['G07', 'G08'],
      },
    ],
  },
];

export const mockTickets: MockTicket[] = [
  {
    id: 'ticket-demo-1',
    orderId: 'order-demo-1',
    ticketTypeId: 'ticket-type-1-vip',
    ownerUserId: 'user-minh-anh',
    ticketCode: 'TBX-2026-001234',
    qrPayload: 'mock-qr-payload-ticket-demo-1',
    seatNumber: 'G07',
    status: 'ACTIVE',
    createdAt: '2026-06-07T20:05:00+07:00',
  },
  {
    id: 'ticket-demo-2',
    orderId: 'order-demo-1',
    ticketTypeId: 'ticket-type-1-vip',
    ownerUserId: 'user-minh-anh',
    ticketCode: 'TBX-2026-001235',
    qrPayload: 'mock-qr-payload-ticket-demo-2',
    seatNumber: 'G08',
    status: 'ACTIVE',
    createdAt: '2026-06-07T20:05:00+07:00',
  },
];

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

const demoReservation = mockReservations[0];
const demoReservationItem = demoReservation.items[0];
const demoTicketType = mockTicketTypes.find((ticketType) => ticketType.id === demoReservationItem.ticketTypeId)!;
const demoUser = mockUsers[0];

export const checkoutMock = {
  reservationId: demoReservation.id,
  concertId: demoReservation.concertId,
  ticketType: demoTicketType.name,
  ticketTypeId: demoTicketType.id,
  quantity: demoReservationItem.quantity,
  unitPrice: demoReservationItem.unitPrice,
  selectedSeats: demoReservationItem.seatLabels,
  expiresAt: demoReservation.expiresAt,
  customer: {
    name: demoUser.fullName,
    email: demoUser.email,
    phone: demoUser.phone,
  },
};

const demoOrder = mockOrders[0];

export const orderMock = {
  orderId: demoOrder.id,
  orderNumber: demoOrder.orderNumber,
  purchaseDate: demoOrder.paidAt ?? demoOrder.createdAt,
  paymentMethod: paymentMethods.find((method) => method.gateway === demoOrder.paymentMethod)?.name ?? demoOrder.paymentMethod,
  tickets: mockTickets
    .filter((ticket) => ticket.orderId === demoOrder.id)
    .map((ticket) => ({
      ticketNumber: ticket.ticketCode,
      seatZone: demoTicketType.name,
      seatNumber: ticket.seatNumber,
      qrPayload: ticket.qrPayload,
    })),
};

export const adminStats = {
  totalEvents: concerts.length,
  ticketsSold: concerts.reduce((sum, concert) => sum + concert.ticketsSold, 0),
  revenue: concerts.reduce((sum, concert) => sum + concert.revenue, 0),
  users: 1840,
  monthlySales: [42, 58, 64, 51, 76, 83, 91, 74],
  ticketDistribution: [
    { label: 'SVIP', value: 14, color: 'bg-primary' },
    { label: 'VIP', value: 24, color: 'bg-[#e0a82e]' },
    { label: 'CAT1', value: 29, color: 'bg-[#3d6f8f]' },
    { label: 'CAT2', value: 25, color: 'bg-accent' },
    { label: 'GA', value: 8, color: 'bg-slate-500' },
  ],
};

export const adminUsers = [mockUsers[1]];
