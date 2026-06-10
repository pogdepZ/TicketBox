import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaClient, TicketType, UserTicketQuota } from '../../generated/prisma';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface OrderItemInput {
  ticketTypeId: string;
  quantity: number;
}

@Injectable()
export class TicketInventoryService {
  /**
   * Lock các dòng TicketType bằng SELECT ... FOR UPDATE.
   * Đảm bảo không có race condition khi nhiều request cùng mua cùng loại vé.
   *
   * Trả về danh sách TicketType theo thứ tự ID đã sort để tránh deadlock.
   */
  async lockTicketTypes(
    tx: TransactionClient,
    ticketTypeIds: string[],
  ): Promise<TicketType[]> {
    // Sort để đảm bảo thứ tự lock nhất quán → tránh deadlock
    const sortedIds = [...ticketTypeIds].sort();

    const rows = await tx.$queryRawUnsafe<TicketType[]>(
      `SELECT
         id,
         concert_id AS "concertId",
         seat_zone_id AS "seatZoneId",
         name,
         price,
         total_quantity AS "totalQuantity",
         remaining,
         max_per_user AS "maxPerUser",
         sale_start_at AS "saleStartAt",
         sale_end_at AS "saleEndAt",
         status,
         created_at AS "createdAt"
       FROM ticket_types
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      sortedIds,
    );

    return rows;
  }

  /**
   * Validate từng ticket type:
   * - Phải thuộc đúng concertId
   * - Status phải là ACTIVE
   * - Trong cửa sổ bán vé (nếu có)
   */
  validateTicketTypes(
    ticketTypes: TicketType[],
    concertId: string,
    items: OrderItemInput[],
  ): void {
    const now = new Date();

    for (const item of items) {
      const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);

      if (!tt) {
        throw new BadRequestException({
          message: 'Invalid ticket type',
          ticketTypeId: item.ticketTypeId,
        });
      }

      if (tt.concertId !== concertId) {
        throw new BadRequestException({
          message: 'Invalid ticket type',
          ticketTypeId: item.ticketTypeId,
        });
      }

      if (tt.status !== 'ACTIVE') {
        throw new ConflictException({
          message: 'Ticket type is not available',
          ticketTypeId: item.ticketTypeId,
          status: tt.status,
        });
      }

      if (tt.saleStartAt && now < tt.saleStartAt) {
        throw new ConflictException({
          message: 'Ticket sale has not started yet',
          ticketTypeId: item.ticketTypeId,
          saleStartAt: tt.saleStartAt,
        });
      }

      if (tt.saleEndAt && now > tt.saleEndAt) {
        throw new ConflictException({
          message: 'Ticket sale has ended',
          ticketTypeId: item.ticketTypeId,
          saleEndAt: tt.saleEndAt,
        });
      }
    }
  }

  /**
   * Kiểm tra tồn kho.
   */
  checkInventory(ticketType: TicketType, quantity: number): void {
    if (ticketType.remaining < quantity) {
      throw new ConflictException({
        message: 'Not enough tickets available',
        ticketTypeId: ticketType.id,
        availableQuantity: ticketType.remaining,
        requested: quantity,
      });
    }
  }

  /**
   * Lock hoặc upsert dòng UserTicketQuota FOR UPDATE.
   * Dùng raw SQL để lock đúng dòng rồi trả về quota hiện tại.
   */
  async lockOrUpsertQuota(
    tx: TransactionClient,
    userId: string,
    ticketTypeId: string,
  ): Promise<UserTicketQuota> {
    // Thử insert trước nếu chưa tồn tại
    await tx.$executeRawUnsafe(
      `INSERT INTO user_ticket_quotas (user_id, ticket_type_id, held_quantity, paid_quantity, updated_at)
       VALUES ($1::uuid, $2::uuid, 0, 0, NOW())
       ON CONFLICT (user_id, ticket_type_id) DO NOTHING`,
      userId,
      ticketTypeId,
    );

    // Lock dòng cho update
    const rows = await tx.$queryRawUnsafe<UserTicketQuota[]>(
      `SELECT
         user_id AS "userId",
         ticket_type_id AS "ticketTypeId",
         held_quantity AS "heldQuantity",
         paid_quantity AS "paidQuantity",
         updated_at AS "updatedAt"
       FROM user_ticket_quotas
       WHERE user_id = $1::uuid AND ticket_type_id = $2::uuid
       FOR UPDATE`,
      userId,
      ticketTypeId,
    );

    return rows[0];
  }

  /**
   * Kiểm tra quota: held + paid + requested <= maxPerUser
   */
  checkQuota(
    quota: UserTicketQuota,
    maxPerUser: number,
    requested: number,
  ): void {
    const total = quota.heldQuantity + quota.paidQuantity + requested;

    if (total > maxPerUser) {
      throw new ConflictException({
        message: 'Ticket limit exceeded',
        maxPerUser,
        held: quota.heldQuantity,
        paid: quota.paidQuantity,
        requested,
      });
    }
  }
}
