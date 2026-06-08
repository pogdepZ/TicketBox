import { Injectable } from '@nestjs/common';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';

@Injectable()
export class CheckinService {
  /**
   * Process a single QR code scan
   * Returns mock check-in result
   */
  async scan(dto: ScanCheckinDto) {
    // TODO: Week 2+ — Implement real QR verification & ticket status check
    return {
      ticketId: 'ticket-mock-001',
      status: 'SUCCESS',
      checkedInAt: new Date().toISOString(),
    };
  }

  /**
   * Process batch sync of offline check-ins
   * Returns mock sync results
   */
  async sync(dto: SyncCheckinDto) {
    // TODO: Week 2+ — Implement real batch sync with idempotency
    const results = dto.items.map((item) => ({
      ticketId: item.ticketId,
      status: 'SYNCED',
      serverId: `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));

    return { results };
  }
}
