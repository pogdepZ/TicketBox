export const API_BASE_URL = 'http://127.0.0.1:4000';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Try to get token from localStorage for client-side fetches
  let token = '';
  if (typeof window !== 'undefined') {
    token = window.localStorage.getItem('access_token') || '';
  }

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API Request failed');
  }

  // BE wrapper format: { statusCode, message, data, metadata }
  const json = await response.json();
  return json.data;
}

// ----------------------------------------------------
// CONCERTS
// ----------------------------------------------------

export async function getConcerts(params?: { status?: string; keyword?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
  }
  
  const queryString = query.toString() ? `?${query.toString()}` : '';
  const data = await fetchApi(`/concerts${queryString}`, { next: { revalidate: 60 } } as any); // use ISR cache
  
  // data format: { items: [], meta: {} }
  return {
    items: data.items.map((concert: any) => mapConcertToDisplay(concert)),
    meta: data.meta,
  };
}

export async function getConcertById(id: string) {
  const concert = await fetchApi(`/concerts/${id}`, { next: { revalidate: 60 } } as any);
  return mapConcertToDisplay(concert);
}

function mapConcertToDisplay(concert: any) {
  // Mapping BE model to what FE components expect based on mock data
  const ticketsSold = concert.ticketsSold ?? 0;
  const capacity = concert.capacity ?? 0;
  
  const isSoldOut = capacity > 0 && ticketsSold >= capacity;
  let statusDisplay = 'Đang bán';
  
  if (concert.status === 'CANCELLED') statusDisplay = 'Đã hủy';
  else if (concert.status === 'COMPLETED') statusDisplay = 'Đã kết thúc';
  else if (isSoldOut) statusDisplay = 'Hết vé';
  else if (capacity > 0 && capacity - ticketsSold <= capacity * 0.2) statusDisplay = 'Sắp hết vé';

  return {
    id: concert.id,
    title: concert.name,
    artist: concert.artistName || 'Various Artists',
    date: concert.eventDate,
    time: new Date(concert.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    venue: concert.venueName,
    city: concert.venueAddress, // Map to address since BE doesn't have separate city field
    image: concert.posterUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=700&fit=crop',
    description: concert.description,
    price: 0, // Will be fetched from ticket zones if needed
    capacity: capacity,
    soldOut: isSoldOut,
    genre: concert.genre || 'N/A',
    language: concert.language || 'N/A',
    ageLimit: concert.ageLimit || 'N/A',
    ticketsSold: ticketsSold,
    revenue: concert.revenue ?? 0,
    status: statusDisplay,
    seatMapSvgUrl: concert.seatMapSvgUrl,
    rawStatus: concert.status,
  };
}

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------

export async function createOrder(payload: any) {
  return await fetchApi('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------
// AUTH
// ----------------------------------------------------

export async function login(payload: any) {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.accessToken) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('access_token', data.accessToken);
    }
  }
  return data;
}

export async function register(payload: any) {
  return await fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile() {
  return await fetchApi('/auth/profile');
}

export async function logout() {
  await fetchApi('/auth/logout', { method: 'POST' });
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('access_token');
  }
}

// ----------------------------------------------------
// MOCKED SEATS & TICKET ZONES (Not in BE yet)
// ----------------------------------------------------

// Import these locally inside functions or handle in mock-data.ts 
// to avoid circular dependency for now, or just expose async mock functions.
import { getTicketZonesByConcertId, getSeatsByConcertId } from './mock-data';

export async function getTicketZonesAsync(concertId: string) {
  try {
    const concert = await fetchApi(`/concerts/${concertId}`, { next: { revalidate: 60 } } as any);
    if (!concert.seatZones || concert.seatZones.length === 0) {
      return getTicketZonesByConcertId(concertId); // fallback if no real zones
    }

    const validMockCodes = ['svip', 'vip', 'premium', 'standard', 'economy'];

    return concert.seatZones.flatMap((zone: any, index: number) => {
      const ticketType = zone.ticketTypes?.[0];
      if (!ticketType) return [];

      let status = 'available';
      if (ticketType.status === 'SOLD_OUT' || ticketType.remaining === 0) status = 'sold-out';
      else if (ticketType.remaining / ticketType.totalQuantity <= 0.15) status = 'limited';

      const mockCode = validMockCodes[index % validMockCodes.length];

      return [{
        id: mockCode,
        name: zone.name,
        label: ticketType.name,
        price: ticketType.price,
        remaining: ticketType.remaining,
        total: ticketType.totalQuantity,
        color: zone.color || '#cccccc',
        description: '',
        status,
        concertId,
        seatZoneId: zone.id,
        ticketTypeId: ticketType.id,
      }];
    });
  } catch (error) {
    console.error('Error fetching ticket zones:', error);
    return getTicketZonesByConcertId(concertId);
  }
}

export async function getSeatsAsync(concertId: string) {
  try {
    const concert = await fetchApi(`/concerts/${concertId}`, { next: { revalidate: 60 } } as any);
    if (!concert.seatZones || concert.seatZones.length === 0) {
       return getSeatsByConcertId(concertId);
    }

    const seats: any[] = [];
    const validMockCodes = ['svip', 'vip', 'premium', 'standard', 'economy'];
    
    concert.seatZones.forEach((zone: any, index: number) => {
      const mockCode = validMockCodes[index % validMockCodes.length];
      const rowNames = ['A', 'B', 'C', 'D'];
      const seatsPerRow = 12;
      
      rowNames.forEach((row, rowIndex) => {
        for (let number = 1; number <= seatsPerRow; number++) {
           const isOuterDisabled = rowIndex === rowNames.length - 1 && (number <= 2 || number >= seatsPerRow - 1);
           const isSold = (rowIndex + number) % 9 === 0;
           const isHeld = (rowIndex + number) % 13 === 0;

           seats.push({
             id: `seat-${concertId}-${mockCode}-${row}-${number}`,
             row,
             number,
             label: `${row}${number.toString().padStart(2, '0')}`,
             status: isOuterDisabled ? 'disabled' : isSold ? 'sold' : isHeld ? 'held' : 'available',
             zoneId: mockCode,
             concertId,
             seatZoneId: zone.id,
           });
        }
      });
    });
    
    return seats;
  } catch (error) {
    return getSeatsByConcertId(concertId);
  }
}
