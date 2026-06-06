export type TicketZoneStatus = 'available' | 'limited' | 'sold-out';

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
}

export type SeatStatus = 'available' | 'selected' | 'sold' | 'held' | 'disabled';

export interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
  status: Exclude<SeatStatus, 'selected'>;
  zoneId: string;
}

export const concerts = [
  {
    id: '1',
    title: 'Đêm Nhạc Ánh Sao',
    artist: 'Hà Anh Tuấn',
    date: '2026-07-18',
    time: '19:30',
    venue: 'Nhà hát Hòa Bình',
    city: 'TP. Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=700&fit=crop',
    description:
      'Một đêm diễn giàu cảm xúc với dàn nhạc live, sân khấu ánh sáng hiện đại và những bản ballad được phối mới dành riêng cho khán giả Sài Gòn.',
    price: 850000,
    capacity: 2400,
    soldOut: false,
    genre: 'Pop Ballad',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    ticketsSold: 1860,
    revenue: 1581000000,
    status: 'Đang bán',
  },
  {
    id: '2',
    title: 'Electric Summer Festival',
    artist: 'DJ Mie, Wukong, Touliver',
    date: '2026-07-25',
    time: '20:00',
    venue: 'Công viên Yên Sở',
    city: 'Hà Nội',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&h=700&fit=crop',
    description:
      'Lễ hội EDM ngoài trời với ba sân khấu, khu ẩm thực, hiệu ứng visual 3D và line-up DJ Việt Nam lẫn quốc tế cho mùa hè 2026.',
    price: 650000,
    capacity: 12000,
    soldOut: false,
    genre: 'EDM',
    language: 'Tiếng Việt / English',
    ageLimit: '18+',
    ticketsSold: 8200,
    revenue: 5330000000,
    status: 'Đang bán',
  },
  {
    id: '3',
    title: 'Jazz By The River',
    artist: 'Saigon Blue Notes',
    date: '2026-08-02',
    time: '20:30',
    venue: 'Bến Bạch Đằng',
    city: 'TP. Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&h=700&fit=crop',
    description:
      'Không gian jazz thân mật bên sông với saxophone, piano trio và các bản standard kinh điển được trình diễn trong khung cảnh thành phố về đêm.',
    price: 420000,
    capacity: 680,
    soldOut: false,
    genre: 'Jazz',
    language: 'Instrumental',
    ageLimit: '16+',
    ticketsSold: 512,
    revenue: 215040000,
    status: 'Sắp hết vé',
  },
  {
    id: '4',
    title: 'Rock Việt Trở Lại',
    artist: 'Bức Tường Tribute Band',
    date: '2026-08-15',
    time: '19:00',
    venue: 'Cung Thể thao Tiên Sơn',
    city: 'Đà Nẵng',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&h=700&fit=crop',
    description:
      'Đêm rock bùng nổ với những ca khúc gắn liền nhiều thế hệ, hệ thống âm thanh lớn và khu standing dành cho fan muốn hòa mình vào sân khấu.',
    price: 500000,
    capacity: 5200,
    soldOut: false,
    genre: 'Rock',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    ticketsSold: 3940,
    revenue: 1970000000,
    status: 'Đang bán',
  },
  {
    id: '5',
    title: 'Indie Night: Thành Phố Mơ',
    artist: 'Vũ., Ngọt, Chillies',
    date: '2026-08-29',
    time: '19:45',
    venue: 'SECC Hall B',
    city: 'TP. Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&h=700&fit=crop',
    description:
      'Ba màu sắc indie Việt trên cùng một sân khấu, kết hợp không gian visual tối giản, khu merch và trải nghiệm check-in dành cho cộng đồng fan.',
    price: 720000,
    capacity: 7000,
    soldOut: false,
    genre: 'Indie',
    language: 'Tiếng Việt',
    ageLimit: '13+',
    ticketsSold: 6100,
    revenue: 4392000000,
    status: 'Sắp hết vé',
  },
  {
    id: '6',
    title: 'Classical Morning',
    artist: 'Vietnam National Symphony Orchestra',
    date: '2026-09-06',
    time: '10:00',
    venue: 'Nhà hát Lớn Hà Nội',
    city: 'Hà Nội',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=900&h=700&fit=crop',
    description:
      'Buổi hòa nhạc buổi sáng với các tác phẩm Mozart, Tchaikovsky và phần giao lưu ngắn cùng nhạc trưởng sau chương trình.',
    price: 380000,
    capacity: 900,
    soldOut: true,
    genre: 'Classical',
    language: 'Instrumental',
    ageLimit: '8+',
    ticketsSold: 900,
    revenue: 342000000,
    status: 'Hết vé',
  },
];

export const ticketZones: TicketZone[] = [
  {
    id: 'svip',
    name: 'SVIP',
    label: 'Khu A',
    price: 1250000,
    remaining: 18,
    total: 160,
    color: '#a78bfa',
    description: 'Khu trung tâm gần sân khấu nhất, tầm nhìn trực diện và lối vào ưu tiên.',
    status: 'limited',
  },
  {
    id: 'vip',
    name: 'VIP',
    label: 'Khu B',
    price: 850000,
    remaining: 76,
    total: 260,
    color: '#ec4899',
    description: 'Khu ghế phía trước hai cánh, phù hợp khán giả muốn trải nghiệm sân khấu gần.',
    status: 'available',
  },
  {
    id: 'premium',
    name: 'Premium',
    label: 'Khu C',
    price: 650000,
    remaining: 124,
    total: 420,
    color: '#38bdf8',
    description: 'Khu trung tâm tầng dưới, cân bằng giữa tầm nhìn, âm thanh và giá vé.',
    status: 'available',
  },
  {
    id: 'standard',
    name: 'Standard',
    label: 'Khu D',
    price: 420000,
    remaining: 310,
    total: 760,
    color: '#06b6d4',
    description: 'Khu ghế tiêu chuẩn phía sau, dễ đi theo nhóm và vẫn nhìn rõ toàn cảnh sân khấu.',
    status: 'available',
  },
  {
    id: 'economy',
    name: 'Economy',
    label: 'Khu E',
    price: 250000,
    remaining: 0,
    total: 540,
    color: '#64748b',
    description: 'Khu tiết kiệm phía xa sân khấu, hiện đã hết vé cho đợt mở bán này.',
    status: 'sold-out',
  },
];

export const ticketTypes = ticketZones.map((zone) => ({
  id: zone.id,
  name: zone.name,
  price: zone.price,
  description: zone.description,
  available: zone.remaining,
}));

export const seatZones = ticketZones.map((zone) => ({
  id: zone.id,
  name: `${zone.name} / ${zone.label}`,
  rows: 8,
  seatsPerRow: 18,
  price: zone.price,
  color: zone.color,
}));

function createZoneSeats(zoneId: string, rowNames: string[], seatsPerRow: number): Seat[] {
  const seats: Seat[] = [];

  rowNames.forEach((row, rowIndex) => {
    for (let number = 1; number <= seatsPerRow; number += 1) {
      const id = `${zoneId}-${row}-${number}`;
      const isOuterDisabled = (rowIndex === rowNames.length - 1 && (number <= 2 || number >= seatsPerRow - 1));
      const isSold = (rowIndex + number) % 9 === 0 || (rowIndex === 1 && number >= 7 && number <= 9);
      const isHeld = (rowIndex + number) % 13 === 0 || (rowIndex === 3 && number === 12);

      seats.push({
        id,
        row,
        number,
        label: `${row}${number.toString().padStart(2, '0')}`,
        status: isOuterDisabled ? 'disabled' : isSold ? 'sold' : isHeld ? 'held' : 'available',
        zoneId,
      });
    }
  });

  return seats;
}

export const seats: Seat[] = [
  ...createZoneSeats('svip', ['A', 'B', 'C', 'D', 'E', 'F'], 16),
  ...createZoneSeats('vip', ['G', 'H', 'I', 'J', 'K', 'L', 'M'], 18),
  ...createZoneSeats('premium', ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'], 20),
  ...createZoneSeats('standard', ['V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC'], 22),
  ...createZoneSeats('economy', ['AD', 'AE', 'AF', 'AG', 'AH', 'AI'], 24).map((seat) => ({
    ...seat,
    status: 'sold' as const,
  })),
];

export const paymentMethods = [
  {
    id: 'card',
    name: 'Thẻ tín dụng / ghi nợ',
    description: 'Visa, Mastercard, JCB',
    icon: 'CreditCard',
  },
  {
    id: 'bank',
    name: 'Chuyển khoản ngân hàng',
    description: 'QR ngân hàng, xác nhận tự động',
    icon: 'Building2',
  },
  {
    id: 'wallet',
    name: 'Ví điện tử',
    description: 'MoMo, ZaloPay, VNPay',
    icon: 'Wallet',
  },
];

export const checkoutMock = {
  concertId: '1',
  ticketType: 'VIP',
  quantity: 2,
  unitPrice: 850000,
  selectedSeats: ['B07', 'B08'],
  customer: {
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    phone: '090 123 4567',
  },
};

export const orderMock = {
  orderNumber: 'ORD-2026-07018',
  purchaseDate: '2026-06-06',
  paymentMethod: 'Thẻ tín dụng / ghi nợ',
  tickets: [
    {
      ticketNumber: 'TBX-2026-001234',
      seatZone: 'B (VIP)',
      seatNumber: 'B07',
    },
    {
      ticketNumber: 'TBX-2026-001235',
      seatZone: 'B (VIP)',
      seatNumber: 'B08',
    },
  ],
};

export const adminStats = {
  totalEvents: concerts.length,
  ticketsSold: concerts.reduce((sum, concert) => sum + concert.ticketsSold, 0),
  revenue: concerts.reduce((sum, concert) => sum + concert.revenue, 0),
  users: 1840,
  monthlySales: [42, 58, 64, 51, 76, 83, 91, 74],
  ticketDistribution: [
    { label: 'SVIP', value: 14, color: 'bg-primary' },
    { label: 'VIP', value: 24, color: 'bg-accent' },
    { label: 'Premium', value: 29, color: 'bg-cyan-500' },
    { label: 'Standard', value: 25, color: 'bg-sky-500' },
    { label: 'Economy', value: 8, color: 'bg-slate-500' },
  ],
};

export const adminUsers = [
  {
    id: '1',
    name: 'Nguyễn Minh Anh',
    email: 'admin@ticketbox.vn',
    password: 'admin123',
    role: 'Quản trị viên',
  },
];
