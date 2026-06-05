import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Concert,
  ConcertStatus as PrismaConcertStatus,
  Prisma,
} from '../../generated/prisma';
import { QueryConcertDto } from './dto/query-concert.dto';
import { ConcertResponseDto } from './dto/concert-response.dto';
import { toPrismaConcertStatus } from './types/concert-status.type';
import { CancelConcertDto } from './dto/cancel-concert.dto';

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
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createConcertDto: CreateConcertDto,
    createdById?: string,
  ): Promise<ConcertResponseDto> {
    const eventDate = this.parseDate(createConcertDto.eventDate, 'eventDate');
    this.validateEventDateInFuture(eventDate);

    const concert = await this.prismaService.concert.create({
      data: {
        name: createConcertDto.name.trim(),
        description: createConcertDto.description,
        artistName: createConcertDto.artistName,
        venueName: createConcertDto.venueName.trim(),
        venueAddress: createConcertDto.venueAddress.trim(),
        eventDate,
        seatMapSvgUrl: createConcertDto.seatMapSvg,
        posterUrl: createConcertDto.posterUrl,
        status: PrismaConcertStatus.DRAFT,
        createdById,
      },
    });

    // TODO: invalidate concert cache after create/update/publish/cancel.
    // TODO: emit audit log event: concert.created.
    return this.toResponse(concert);
  }

  async findAll(query: QueryConcertDto): Promise<PaginatedConcerts> {
    const where = this.buildWhereQuery(query);

    return this.findMany(where, query.page, query.limit);
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
    const concert = await this.findConcertOrThrow(id);

    // TODO: include ticketTypes or related data only through owning modules when needed.
    return this.toResponse(concert);
  }

  async update(
    id: string,
    updateConcertDto: UpdateConcertDto,
  ): Promise<ConcertResponseDto> {
    const concert = await this.findConcertOrThrow(id);
    this.assertCanUpdate(concert, updateConcertDto);

    const data = this.buildUpdateData(concert, updateConcertDto);
    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data,
    });

    // TODO: invalidate concert cache after create/update/publish/cancel.
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

    // TODO: invalidate concert cache after create/update/publish/cancel.
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
    // TODO: invalidate concert cache after create/update/publish/cancel.
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
}
