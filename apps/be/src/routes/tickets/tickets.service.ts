import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketsService {
  buildMockTicketPreview(orderId: string) {
    return {
      success: true,
      data: {
        orderId,
        status: 'MOCK_ONLY',
        note: 'Tickets will be generated after payment success in week 2.',
      },
      message: 'Mock ticket preview created',
    };
  }
}
