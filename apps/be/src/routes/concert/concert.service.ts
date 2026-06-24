import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Concert,
  ConcertStatus as PrismaConcertStatus,
  Prisma,
  ReservationStatus,
} from '../../generated/prisma';
import { QueryConcertDto } from './dto/query-concert.dto';
import { ConcertResponseDto } from './dto/concert-response.dto';
import { toPrismaConcertStatus } from './types/concert-status.type';
import { CancelConcertDto } from './dto/cancel-concert.dto';
import { RedisService } from '../../common/redis/redis.service';
import { S3Service } from '../../common/s3/s3.service';

const CONCERT_CACHE_TTL_SECONDS = 300;
const CONCERT_LIST_CACHE_KEY = 'cache:concert:list';
const CONCERT_DETAIL_CACHE_KEY_PREFIX = 'cache:concert';

type PaginatedConcerts = {
  items: ConcertResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class ConcertService {
  private readonly logger = new Logger(ConcertService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly s3Service: S3Service,
  ) {}

  private async uploadSeatMapSvgIfRaw(
    concertId: string,
    seatMapSvgOrUrl?: string,
  ): Promise<string | undefined> {
    if (!seatMapSvgOrUrl) {
      return undefined;
    }

    const isRawSvg = seatMapSvgOrUrl.trim().startsWith('<') && seatMapSvgOrUrl.includes('svg');
    if (isRawSvg) {
      const s3Key = `concerts/${concertId}/seat-maps/map.svg`;
      return this.s3Service.uploadFile(
        s3Key,
        Buffer.from(seatMapSvgOrUrl, 'utf-8'),
        'image/svg+xml',
      );
    }

    return seatMapSvgOrUrl;
  }

  async create(
    createConcertDto: CreateConcertDto,
    createdById?: string,
  ): Promise<ConcertResponseDto> {
    const eventDate = this.parseDate(createConcertDto.eventDate, 'eventDate');
    this.validateEventDateInFuture(eventDate);

    const concertId = randomUUID();
    let seatMapSvgUrl = undefined;
    if (createConcertDto.seatMapSvg) {
      seatMapSvgUrl = await this.uploadSeatMapSvgIfRaw(concertId, createConcertDto.seatMapSvg);
    }

    const concert = await this.prismaService.$transaction(async (tx) => {
      const createdConcert = await tx.concert.create({
        data: {
          id: concertId,
          name: createConcertDto.name.trim(),
          description: createConcertDto.description,
          artistName: createConcertDto.artistName,
          venueName: createConcertDto.venueName.trim(),
          venueAddress: createConcertDto.venueAddress.trim(),
          eventDate,
          seatMapSvgUrl,
          posterUrl: createConcertDto.posterUrl,
          status: PrismaConcertStatus.DRAFT,
          createdById,
        },
      });

      if (createConcertDto.ticketTypes && createConcertDto.ticketTypes.length > 0) {
        for (let i = 0; i < createConcertDto.ticketTypes.length; i++) {
          const tt = createConcertDto.ticketTypes[i];
          const zoneCode = tt.name.replace(/\s+/g, '-').toLowerCase();

          // 1. Create SeatZone
          const zone = await tx.seatZone.create({
            data: {
              concertId,
              code: zoneCode,
              name: tt.name.trim(),
              color: ['#e5484d', '#e0a82e', '#3d6f8f', '#123c3a', '#64748b'][i % 5],
            },
          });

          // 2. Create TicketType
          await tx.ticketType.create({
            data: {
              concertId,
              seatZoneId: zone.id,
              name: tt.name.trim(),
              price: tt.price,
              totalQuantity: tt.totalQuantity,
              remaining: tt.totalQuantity,
              maxPerUser: tt.maxPerUser ?? 4,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Fetch the concert with seatZones and ticketTypes included so that it matches what we return
      return tx.concert.findUnique({
        where: { id: concertId },
        include: {
          seatZones: {
            include: {
              ticketTypes: true,
            },
          },
        },
      });
    });

    await this.invalidateConcertCache(concert!.id);
    // TODO: emit audit log event: concert.created.
    return this.toResponse(concert!);
  }

  async findAll(query: QueryConcertDto): Promise<PaginatedConcerts> {
    const cacheKey = this.buildConcertListCacheKey(query);
    const cached = await this.getCache<PaginatedConcerts>(cacheKey);

    if (cached) {
      return cached;
    }

    const where = this.buildWhereQuery(query);
    const concerts = await this.findMany(where, query.page, query.limit);

    await this.setCache(cacheKey, concerts);

    return concerts;
  }

  private async findMany(
    where: Prisma.ConcertWhereInput,
    page: number,
    limit: number,
  ): Promise<PaginatedConcerts> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.concert.findMany({
        where,
        skip,
        take: limit,
        // Upcoming concerts are more useful first for ticket browsing and operations.
        orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prismaService.concert.count({ where }),
    ]);

    return {
      items: items.map((concert) => this.toResponse(concert)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ConcertResponseDto> {
    const cacheKey = this.buildConcertDetailCacheKey(id);
    const cached = await this.getCache<ConcertResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const concert = await this.prismaService.concert.findUnique({
      where: { id },
      include: {
        seatZones: {
          include: {
            ticketTypes: true
          }
        }
      }
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    const response = this.toResponse(concert);

    await this.setCache(cacheKey, response);

    return response;
  }

  async getReservedSeats(concertId: string) {
    const seats = await this.prismaService.reservationSeat.findMany({
      where: {
        concertId,
        OR: [
          { status: ReservationStatus.CONFIRMED },
          {
            status: ReservationStatus.HELD,
            expiresAt: { gt: new Date() },
          },
        ],
      },
      select: {
        seatNumber: true,
        status: true,
      },
    });
    return seats;
  }

  async update(
    id: string,
    updateConcertDto: UpdateConcertDto,
  ): Promise<ConcertResponseDto> {
    const concert = await this.findConcertOrThrow(id);
    this.assertCanUpdate(concert, updateConcertDto);

    if (updateConcertDto.seatMapSvg !== undefined) {
      updateConcertDto.seatMapSvg = await this.uploadSeatMapSvgIfRaw(id, updateConcertDto.seatMapSvg);
    }

    const data = this.buildUpdateData(concert, updateConcertDto);
    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data,
    });

    await this.invalidateConcertCache(id);
    // TODO: emit audit log event: concert.updated.
    return this.toResponse(updatedConcert);
  }

  async publish(id: string): Promise<ConcertResponseDto> {
    const concert = await this.findConcertOrThrow(id);

    if (concert.status !== PrismaConcertStatus.DRAFT) {
      throw new ConflictException('Only draft concerts can be published');
    }

    this.validatePublishable(concert);
    // TODO: TicketTypeModule may validate ticket type readiness before publish later.

    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data: { status: PrismaConcertStatus.PUBLISHED },
    });

    await this.invalidateConcertCache(id);
    // TODO: emit audit log event: concert.published.
    return this.toResponse(updatedConcert);
  }

  async cancel(
    id: string,
    _cancelConcertDto?: CancelConcertDto,
  ): Promise<ConcertResponseDto> {
    const concert = await this.findConcertOrThrow(id);

    if (concert.status === PrismaConcertStatus.COMPLETED) {
      throw new ConflictException('Completed concerts cannot be cancelled');
    }

    if (concert.status === PrismaConcertStatus.CANCELLED) {
      return this.toResponse(concert);
    }

    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data: { status: PrismaConcertStatus.CANCELLED },
    });

    // TODO: PaymentModule/NotificationModule handle refund and notifications later.
    await this.invalidateConcertCache(id);
    // TODO: emit audit log event: concert.cancelled.
    return this.toResponse(updatedConcert);
  }

  async complete(id: string): Promise<ConcertResponseDto> {
    const concert = await this.findConcertOrThrow(id);

    if (concert.status !== PrismaConcertStatus.PUBLISHED) {
      throw new ConflictException('Only published concerts can be completed');
    }

    if (concert.eventDate.getTime() > Date.now()) {
      throw new BadRequestException('Concert can only be completed after eventDate');
    }

    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data: { status: PrismaConcertStatus.COMPLETED },
    });

    await this.invalidateConcertCache(id);
    // TODO: emit audit log event: concert.completed.
    return this.toResponse(updatedConcert);
  }

  private async findConcertOrThrow(id: string): Promise<Concert> {
    const concert = await this.prismaService.concert.findUnique({
      where: { id },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    return concert;
  }

  private validateEventDateInFuture(eventDate: Date): void {
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException('eventDate must be a valid date');
    }

    if (eventDate.getTime() <= Date.now()) {
      throw new BadRequestException('eventDate must be greater than now');
    }
  }

  private validatePublishable(concert: Concert): void {
    if (!concert.name.trim()) {
      throw new BadRequestException('Concert name is required');
    }

    if (!concert.venueName.trim()) {
      throw new BadRequestException('Concert venueName is required');
    }

    if (!concert.venueAddress.trim()) {
      throw new BadRequestException('Concert venueAddress is required');
    }

    this.validateEventDateInFuture(concert.eventDate);
  }

  private buildWhereQuery(query: QueryConcertDto): Prisma.ConcertWhereInput {
    const where: Prisma.ConcertWhereInput = {};
    const andConditions: Prisma.ConcertWhereInput[] = [];
    const keyword = query.keyword?.trim();

    if (query.status) {
      where.status = toPrismaConcertStatus(query.status);
    }

    if (keyword) {
      andConditions.push({
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { artistName: { contains: keyword, mode: 'insensitive' } },
          { venueName: { contains: keyword, mode: 'insensitive' } },
        ],
      });
    }

    if (query.fromDate || query.toDate) {
      const eventDate: Prisma.DateTimeFilter<'Concert'> = {};

      if (query.fromDate) {
        eventDate.gte = this.parseDate(query.fromDate, 'fromDate');
      }

      if (query.toDate) {
        eventDate.lte = this.parseDate(query.toDate, 'toDate');
      }

      andConditions.push({ eventDate });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  private assertCanUpdate(concert: Concert, dto: UpdateConcertDto): void {
    if (
      concert.status === PrismaConcertStatus.CANCELLED ||
      concert.status === PrismaConcertStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Cancelled or completed concerts cannot be updated',
      );
    }

    if (concert.status !== PrismaConcertStatus.PUBLISHED) {
      return;
    }

    const safePublishedFields: Array<keyof UpdateConcertDto> = [
      'description',
      'posterUrl',
      'seatMapSvg',
      'artistBio',
    ];
    const updatedFields = Object.keys(dto) as Array<keyof UpdateConcertDto>;
    const invalidField = updatedFields.find(
      (field) => !safePublishedFields.includes(field),
    );

    if (invalidField) {
      throw new ForbiddenException(
        `Field ${String(invalidField)} cannot be updated after publish`,
      );
    }
  }

  private buildUpdateData(
    concert: Concert,
    dto: UpdateConcertDto,
  ): Prisma.ConcertUncheckedUpdateInput {
    const data: Prisma.ConcertUncheckedUpdateInput = {};

    if (concert.status === PrismaConcertStatus.DRAFT) {
      if (dto.name !== undefined) {
        data.name = dto.name.trim();
      }

      if (dto.artistName !== undefined) {
        data.artistName = dto.artistName;
      }

      if (dto.venueName !== undefined) {
        data.venueName = dto.venueName.trim();
      }

      if (dto.venueAddress !== undefined) {
        data.venueAddress = dto.venueAddress.trim();
      }

      if (dto.eventDate !== undefined) {
        const eventDate = this.parseDate(dto.eventDate, 'eventDate');
        this.validateEventDateInFuture(eventDate);
        data.eventDate = eventDate;
      }
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.seatMapSvg !== undefined) {
      data.seatMapSvgUrl = dto.seatMapSvg;
    }

    if (dto.posterUrl !== undefined) {
      data.posterUrl = dto.posterUrl;
    }

    if (dto.artistBio !== undefined) {
      data.artistBio = dto.artistBio;
    }

    return data;
  }

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private toResponse(concert: Concert): ConcertResponseDto {
    return new ConcertResponseDto(concert);
  }

  private buildConcertListCacheKey(query: QueryConcertDto): string {
    const normalizedQuery = {
      page: query.page,
      limit: query.limit,
      status: query.status ?? null,
      keyword: query.keyword?.trim() || null,
      fromDate: query.fromDate ?? null,
      toDate: query.toDate ?? null,
    };

    const hash = createHash('sha1')
      .update(JSON.stringify(normalizedQuery))
      .digest('hex');

    return `${CONCERT_LIST_CACHE_KEY}:${hash}`;
  }

  private buildConcertDetailCacheKey(id: string): string {
    return `${CONCERT_DETAIL_CACHE_KEY_PREFIX}:${id}`;
  }

  private async getCache<T>(key: string): Promise<T | null> {
    try {
      return await this.redisService.getJson<T>(key);
    } catch (error) {
      this.logger.warn(`Failed to read Redis cache for key ${key}`, error);
      return null;
    }
  }

  private async setCache(key: string, value: unknown): Promise<void> {
    try {
      await this.redisService.setJson(key, value, CONCERT_CACHE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Failed to write Redis cache for key ${key}`, error);
    }
  }

  private async invalidateConcertCache(concertId: string): Promise<void> {
    try {
      await Promise.all([
        this.redisService.delPattern(`${CONCERT_LIST_CACHE_KEY}*`),
        this.redisService.del(this.buildConcertDetailCacheKey(concertId)),
      ]);
    } catch (error) {
      this.logger.warn(`Failed to invalidate concert cache for ${concertId}`, error);
    }
  }

  async createTicketType(
    concertId: string,
    dto: CreateTicketTypeDto,
  ) {
    await this.findConcertOrThrow(concertId);

    const zoneCode = dto.name.replace(/\s+/g, '-').toLowerCase();

    const ticketType = await this.prismaService.$transaction(async (tx) => {
      // 1. Find or create SeatZone
      let seatZone = await tx.seatZone.findFirst({
        where: { concertId, code: zoneCode },
      });

      if (!seatZone) {
        // Find existing seatZones count to pick a color
        const zonesCount = await tx.seatZone.count({ where: { concertId } });
        seatZone = await tx.seatZone.create({
          data: {
            concertId,
            code: zoneCode,
            name: dto.name.trim(),
            color: ['#e5484d', '#e0a82e', '#3d6f8f', '#123c3a', '#64748b'][zonesCount % 5],
          },
        });
      }

      // 2. Create TicketType
      return tx.ticketType.create({
        data: {
          concertId,
          seatZoneId: seatZone.id,
          name: dto.name.trim(),
          price: dto.price,
          totalQuantity: dto.totalQuantity,
          remaining: dto.totalQuantity,
          maxPerUser: dto.maxPerUser,
          saleStartAt: dto.saleStartAt ? new Date(dto.saleStartAt) : null,
          saleEndAt: dto.saleEndAt ? new Date(dto.saleEndAt) : null,
          status: 'ACTIVE',
        },
      });
    });

    await this.invalidateConcertCache(concertId);
    return ticketType;
  }

  async updateTicketType(
    concertId: string,
    ticketTypeId: string,
    dto: UpdateTicketTypeDto,
  ) {
    await this.findConcertOrThrow(concertId);

    const ticketType = await this.prismaService.ticketType.findFirst({
      where: { id: ticketTypeId, concertId },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    const diff = dto.totalQuantity !== undefined ? dto.totalQuantity - ticketType.totalQuantity : 0;
    const newRemaining = ticketType.remaining + diff;
    if (newRemaining < 0) {
      throw new BadRequestException('Cannot reduce total quantity below currently sold tickets');
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      // 1. Update SeatZone if name changed
      if (dto.name && ticketType.seatZoneId) {
        try {
          const newCode = dto.name.replace(/\s+/g, '-').toLowerCase();
          await tx.seatZone.update({
            where: { id: ticketType.seatZoneId },
            data: {
              name: dto.name.trim(),
              code: newCode,
            },
          });
        } catch {
          await tx.seatZone.update({
            where: { id: ticketType.seatZoneId },
            data: {
              name: dto.name.trim(),
            },
          });
        }
      }

      // 2. Update TicketType
      return tx.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          name: dto.name?.trim(),
          price: dto.price,
          totalQuantity: dto.totalQuantity,
          remaining: dto.totalQuantity !== undefined ? newRemaining : undefined,
          maxPerUser: dto.maxPerUser,
          saleStartAt: dto.saleStartAt !== undefined ? (dto.saleStartAt ? new Date(dto.saleStartAt) : null) : undefined,
          saleEndAt: dto.saleEndAt !== undefined ? (dto.saleEndAt ? new Date(dto.saleEndAt) : null) : undefined,
        },
      });
    });

    await this.invalidateConcertCache(concertId);
    return updated;
  }

  async deleteTicketType(concertId: string, ticketTypeId: string) {
    await this.findConcertOrThrow(concertId);

    const ticketType = await this.prismaService.ticketType.findFirst({
      where: { id: ticketTypeId, concertId },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    const ticketsCount = await this.prismaService.ticket.count({
      where: { ticketTypeId },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException('Cannot delete ticket type that already has purchased tickets');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.ticketType.delete({
        where: { id: ticketTypeId },
      });

      if (ticketType.seatZoneId) {
        await tx.seatZone.delete({
          where: { id: ticketType.seatZoneId },
        });
      }
    });

    await this.invalidateConcertCache(concertId);
    return { success: true };
  }
}
