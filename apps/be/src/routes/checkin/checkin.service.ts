import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async scan(dto: ScanCheckinDto) {
    const { qrCodeData, staffId, concertId, deviceId, clientEventId } = dto;

    let extractedTicketCode = qrCodeData;
    const ticketSecret = this.config.get<string>('JWT_TICKET_SECRET', 'ticket-secret');

    // 1. Verify JWS and extract ticket_code
    try {
      const decoded = jwt.verify(qrCodeData, ticketSecret) as any;
      if (decoded && decoded.ticket_code) {
        extractedTicketCode = decoded.ticket_code;
      }
    } catch (e: any) {
      this.logger.warn(`Failed to verify JWT for checkin: ${e.message}`);
      return {
        ticketId: 'unknown',
        status: 'INVALID_TICKET',
        checkedInAt: new Date().toISOString(),
      };
    }

    // 2. Resolve ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: extractedTicketCode },
      include: {
        order: true,
      },
    });
    
    if (!ticket || ticket.order.concertId !== concertId) {
      return {
        ticketId: ticket ? ticket.id : 'unknown',
        status: 'INVALID_CONCERT',
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
        returnStatus = 'ALREADY_CHECKED_IN';
      } else if (currentTicket.status !== 'ACTIVE') {
        checkinResult = 'REJECTED';
        returnStatus = 'INVALID_TICKET';
      } else {
        checkinResult = 'ACCEPTED';
        returnStatus = 'ACCEPTED';
        
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

      const checkedInAt = new Date();
      // Record the checkin event
      await tx.checkinEvent.create({
        data: {
          ticketId: ticket.id,
          staffUserId: staffId,
          deviceId: deviceId,
          clientEventId: clientEventId || `scan-${Date.now()}`,
          mode: 'ONLINE',
          result: checkinResult,
          scannedAtClient: checkedInAt,
        },
      });

      return {
        ticketId: ticket.id,
        status: returnStatus,
        checkedInAt: checkedInAt.toISOString(),
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
        // Idempotency check: see if this exact event was already processed
        if (item.clientEventId) {
          const existingEvent = await this.prisma.checkinEvent.findUnique({
            where: {
              deviceId_clientEventId: {
                deviceId: item.sourceDeviceId,
                clientEventId: item.clientEventId,
              },
            },
          });

          if (existingEvent) {
            results.push({
              ticketId: item.ticketId,
              status: 'SYNCED', // Already synced previously
              serverId: existingEvent.id,
              originalStatus: existingEvent.result,
            });
            continue;
          }
        }

        const result = await this.scan({
          qrCodeData: item.qrCodeData,
          staffId: item.staffId,
          concertId: item.concertId,
          deviceId: item.sourceDeviceId,
          clientEventId: item.clientEventId, // Use provided event ID
        });

        let syncStatus = 'FAILED';
        if (result.status === 'ACCEPTED') {
          syncStatus = 'SYNCED';
        } else if (result.status === 'ALREADY_CHECKED_IN') {
          syncStatus = 'CONFLICT';
        } else {
          syncStatus = 'REJECTED';
        }

        results.push({
          ticketId: item.ticketId,
          status: syncStatus,
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

  async getSnapshot(concertId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        concertId,
        status: {
          in: ['ACTIVE', 'USED'],
        },
      },
      include: {
        ticketType: true,
        owner: true,
      },
    });

    const guests = await this.prisma.guestList.findMany({
      where: {
        concertId,
        status: {
          in: ['ACTIVE', 'CHECKED_IN'],
        },
      },
    });

    const ticketSecret = this.config.get<string>('JWT_TICKET_SECRET', 'ticket-secret');
    const version = Date.now().toString();

    return {
      version,
      publicKey: ticketSecret,
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketCode: t.ticketCode,
        status: t.status,
        guestName: t.owner?.fullName || 'Khách Hàng',
        ticketType: t.ticketType?.name || '---',
      })),
      guests: guests.map((g) => ({
        id: g.id,
        guestCode: g.guestCode,
        fullName: g.fullName,
        email: g.email || null,
        status: g.status,
      })),
    };
  }
}
