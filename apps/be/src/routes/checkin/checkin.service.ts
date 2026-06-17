import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';

@Injectable()
export class CheckinService {
  constructor(private prisma: PrismaService) {}

  async scan(dto: ScanCheckinDto) {
    const { qrCodeData, staffId, concertId, deviceId, clientEventId } = dto;

    // 1. Resolve ticket by qrCodeData (assuming ticketCode for now)
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: qrCodeData },
      include: {
        order: true,
      },
    });

    console.log("ticket>>>>>>:", ticket)

    if (!ticket || ticket.order.concertId !== concertId) {
      return {
        ticketId: 'unknown',
        status: 'NOT_FOUND',
        checkedInAt: new Date().toISOString(),
      };
    }

    // Use a transaction to prevent race conditions on check-in
    return await this.prisma.$transaction(async (tx) => {
      // Re-fetch ticket with lock if needed, but simple read is often ok 
      // or we just rely on the status update condition.
      const currentTicket = await tx.ticket.findUnique({
        where: { id: ticket.id },
      });

      if (!currentTicket) throw new Error('Ticket not found');

      let checkinResult: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' = 'REJECTED';
      let returnStatus = 'REJECTED';

      if (currentTicket.status === 'USED') {
        checkinResult = 'DUPLICATE';
        returnStatus = 'DUPLICATE';
      } else if (currentTicket.status !== 'ACTIVE') {
        checkinResult = 'REJECTED';
        returnStatus = 'NOT_FOUND'; // Or a specific status like INVALID
      } else {
        checkinResult = 'ACCEPTED';
        returnStatus = 'SUCCESS';
        
        // Update ticket
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'USED',
            scannedAt: new Date(),
            scannedById: staffId,
            scannedDevice: deviceId,
          },
        });
      }

      // Record the checkin event
      await tx.checkinEvent.create({
        data: {
          ticketId: ticket.id,
          staffUserId: staffId,
          deviceId: deviceId,
          clientEventId: clientEventId || `scan-${Date.now()}`,
          mode: 'ONLINE',
          result: checkinResult,
          scannedAtClient: new Date(),
        },
      });

      return {
        ticketId: ticket.id,
        status: returnStatus,
        checkedInAt: new Date().toISOString(),
        guestName: 'Guest (Resolved)', // Normally resolved from ticket.owner
        ticketType: 'Resolved Type',
        ticketCode: ticket.ticketCode,
        concertName: 'Resolved Concert',
      };
    });
  }

  async sync(dto: SyncCheckinDto) {
    const results = [];

    // Process each item
    for (const item of dto.items) {
      try {
        const result = await this.scan({
          qrCodeData: item.qrCodeData,
          staffId: item.staffId,
          concertId: item.concertId,
          deviceId: item.sourceDeviceId,
          clientEventId: `sync-${item.ticketId}-${item.checkedAt}`,
        });

        results.push({
          ticketId: item.ticketId,
          status: result.status === 'SUCCESS' || result.status === 'DUPLICATE' ? 'SYNCED' : 'FAILED',
          serverId: `server-${Date.now()}`,
          originalStatus: result.status,
        });
      } catch (error) {
        // Handle FK constraint errors or others gracefully during sync
        results.push({
          ticketId: item.ticketId,
          status: 'FAILED',
          serverId: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results };
  }
}
