import { Injectable } from '@nestjs/common';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';

@Injectable()
export class CheckinService {
  async scan(_dto: ScanCheckinDto) {
    return {
      ticketId: 'ticket-mock-001',
      status: 'SUCCESS',
      checkedInAt: new Date().toISOString(),
    };
  }

  async sync(dto: SyncCheckinDto) {
    const results = dto.items.map((item) => ({
      ticketId: item.ticketId,
      status: 'SYNCED',
      serverId: `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));

    return { results };
  }
}
