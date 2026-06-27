import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { CreateConcertDto } from "./dto/create-concert.dto";
import { UpdateConcertDto } from "./dto/update-concert.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  Concert,
  ConcertStatus as PrismaConcertStatus,
  Prisma,
  ReservationStatus,
} from "../../generated/prisma";
import { QueryConcertDto } from "./dto/query-concert.dto";
import { ConcertResponseDto } from "./dto/concert-response.dto";
import { toPrismaConcertStatus } from "./types/concert-status.type";
import { CancelConcertDto } from "./dto/cancel-concert.dto";
import { RedisService } from "../../common/redis/redis.service";
import { S3Service } from "../../common/s3/s3.service";
import { UploadedFileDto } from "./dto/uploaded-file.dto";

const CONCERT_CACHE_TTL_SECONDS = 300;
const CONCERT_LIST_CACHE_KEY = "cache:concert:list";
const CONCERT_DETAIL_CACHE_KEY_PREFIX = "cache:concert";
const MAX_SEAT_MAP_SVG_BYTES = 1024 * 1024;
const SVG_ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
]);
const SVG_ALLOWED_ATTRIBUTES = new Set([
  "id",
  "class",
  "viewBox",
  "xmlns",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "opacity",
  "transform",
  "font-size",
  "text-anchor",
  "data-zone-code",
  "data-zone-name",
  "data-ticket-name",
  "data-total-quantity",
  "data-price",
  "data-max-per-user",
  "data-seat-number",
]);

type PaginatedConcerts = {
  items: ConcertResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ParsedSeatMapTicketType = {
  name: string;
  price: number;
  totalQuantity: number;
  maxPerUser: number;
  zoneCode: string;
  svgElementId: string;
  seatNumbers: string[];
};

type ParsedSeatMapSeat = {
  zoneCode: string;
  seatNumber: string;
  svgElementId?: string;
};

type SanitizedSeatMapSvg = {
  svg: string;
  ticketTypes: ParsedSeatMapTicketType[];
  seats: ParsedSeatMapSeat[];
};

type ConcertTicketTypeInput = {
  name: string;
  price: number;
  totalQuantity: number;
  maxPerUser?: number;
  zoneCode?: string;
  svgElementId?: string;
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

    const isRawSvg =
      seatMapSvgOrUrl.trim().startsWith("<") && seatMapSvgOrUrl.includes("svg");
    if (isRawSvg) {
      const s3Key = `concerts/${concertId}/seat-maps/map.svg`;
      return this.s3Service.uploadFile(
        s3Key,
        Buffer.from(seatMapSvgOrUrl, "utf-8"),
        "image/svg+xml",
      );
    }

    return seatMapSvgOrUrl;
  }

  async create(
    createConcertDto: CreateConcertDto,
    createdById?: string,
  ): Promise<ConcertResponseDto> {
    const eventDate = this.parseDate(createConcertDto.eventDate, "eventDate");
    this.validateEventDateInFuture(eventDate);

    const concertId = randomUUID();
    let seatMapSvgUrl = undefined;
    if (createConcertDto.seatMapSvg) {
      const sanitizedRawSvg = createConcertDto.seatMapSvg.trim().startsWith("<")
        ? this.validateSanitizeAndParseSeatMapSvg(createConcertDto.seatMapSvg)
            .svg
        : createConcertDto.seatMapSvg;
      seatMapSvgUrl = await this.uploadSeatMapSvgIfRaw(
        concertId,
        sanitizedRawSvg,
      );
    }
    const ticketTypes: ConcertTicketTypeInput[] =
      createConcertDto.ticketTypes ?? [];

    const concert = await this.prismaService.$transaction(async (tx) => {
      const createdConcert = await tx.concert.create({
        data: {
          id: concertId,
          name: createConcertDto.name.trim(),
          slug: slugify(createConcertDto.name),
          description: createConcertDto.description,
          type: createConcertDto.type?.trim(),
          city: createConcertDto.city?.trim(),
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

      if (ticketTypes.length > 0) {
        for (let i = 0; i < ticketTypes.length; i++) {
          const tt = ticketTypes[i];
          const zoneCode =
            tt.zoneCode ?? tt.name.replace(/\s+/g, "-").toLowerCase();

          // 1. Create SeatZone
          const zone = await tx.seatZone.create({
            data: {
              concertId,
              code: zoneCode,
              name: tt.name.trim(),
              color: ["#e5484d", "#e0a82e", "#3d6f8f", "#123c3a", "#64748b"][
                i % 5
              ],
              svgElementId: tt.svgElementId,
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
              status: "ACTIVE",
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

  async uploadSeatMapSvg(
    concertId: string,
    seatMapSvgFile?: UploadedFileDto,
  ): Promise<ConcertResponseDto> {
    if (!seatMapSvgFile) {
      throw new BadRequestException("Seat map SVG file is required");
    }

    const concert = await this.findConcertOrThrow(concertId);

    if (concert.status !== PrismaConcertStatus.DRAFT) {
      throw new ConflictException(
        "Seat map SVG can only be uploaded for draft concerts",
      );
    }

    const parsedSeatMap =
      this.validateSanitizeAndParseSeatMapSvg(seatMapSvgFile);
    const seatMapSvgUrl = await this.uploadSeatMapSvgIfRaw(
      concertId,
      parsedSeatMap.svg,
    );

    const updatedConcert = await this.prismaService.$transaction(async (tx) => {
      const [ticketsCount, reservationsCount] = await Promise.all([
        tx.ticket.count({ where: { concertId } }),
        tx.reservation.count({ where: { concertId } }),
      ]);

      if (ticketsCount > 0 || reservationsCount > 0) {
        throw new ConflictException(
          "Cannot replace seat map after tickets or reservations exist",
        );
      }

      await tx.ticketType.deleteMany({ where: { concertId } });
      await tx.seatZone.deleteMany({ where: { concertId } });

      await tx.concert.update({
        where: { id: concertId },
        data: { seatMapSvgUrl },
      });

      for (let i = 0; i < parsedSeatMap.ticketTypes.length; i++) {
        const tt = parsedSeatMap.ticketTypes[i];
        const zone = await tx.seatZone.create({
          data: {
            concertId,
            code: tt.zoneCode,
            name: tt.name,
            color: ["#e5484d", "#e0a82e", "#3d6f8f", "#123c3a", "#64748b"][
              i % 5
            ],
            svgElementId: tt.svgElementId,
          },
        });

        await tx.ticketType.create({
          data: {
            concertId,
            seatZoneId: zone.id,
            name: tt.name,
            price: tt.price,
            totalQuantity: tt.totalQuantity,
            remaining: tt.totalQuantity,
            maxPerUser: tt.maxPerUser,
            status: "ACTIVE",
          },
        });
      }

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

    await this.invalidateConcertCache(concertId);
    return this.toResponse(updatedConcert!);
  }

  async uploadPoster(file?: UploadedFileDto): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("Poster file is required");
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        "Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.",
      );
    }

    const fileExtension = file.originalname.split(".").pop();
    const s3Key = `concerts/posters/${randomUUID()}.${fileExtension}`;

    try {
      const fileUrl = await this.s3Service.uploadFile(
        s3Key,
        file.buffer,
        file.mimetype,
      );
      return { url: fileUrl };
    } catch (error) {
      this.logger.error("Failed to upload poster to S3/MinIO", error);
      throw new BadRequestException("Failed to upload poster image");
    }
  }

  private validateSanitizeAndParseSeatMapSvg(
    input: UploadedFileDto | string,
  ): SanitizedSeatMapSvg {
    const rawSvg =
      typeof input === "string" ? input : this.readSvgUpload(input);

    if (!rawSvg.trim().startsWith("<svg") || !rawSvg.includes("</svg>")) {
      throw new BadRequestException(
        "Seat map must be a valid inline SVG document",
      );
    }

    if (
      /(<\s*(script|iframe|object|embed|foreignObject|image|use)\b)|on[a-z]+\s*=|javascript:|data:text\/html/i.test(
        rawSvg,
      )
    ) {
      throw new BadRequestException("Seat map SVG contains unsafe content");
    }

    const parsedSeatMap = this.parseTicketTypesFromSvg(rawSvg);
    const sanitizedSvg = this.sanitizeSeatMapSvg(rawSvg);

    return { svg: sanitizedSvg, ...parsedSeatMap };
  }

  private readSvgUpload(file: UploadedFileDto): string {
    if (!file) {
      throw new BadRequestException("SVG file is required");
    }

    if (file.size > MAX_SEAT_MAP_SVG_BYTES) {
      throw new BadRequestException("Seat map SVG must not exceed 1 MB");
    }

    if (
      file.mimetype !== "image/svg+xml" &&
      !file.originalname.toLowerCase().endsWith(".svg")
    ) {
      throw new BadRequestException(
        "Only .svg files are accepted for seat map upload",
      );
    }

    return file.buffer.toString("utf-8");
  }

  private parseTicketTypesFromSvg(svg: string): {
    ticketTypes: ParsedSeatMapTicketType[];
    seats: ParsedSeatMapSeat[];
  } {
    const zones = new Map<
      string,
      Omit<ParsedSeatMapTicketType, "totalQuantity" | "seatNumbers"> & {
        declaredTotalQuantity?: number;
      }
    >();
    const seatsByZone = new Map<string, ParsedSeatMapSeat[]>();
    const seenSeats = new Set<string>();
    const tagRegex = /<([a-zA-Z][\w:-]*)([^>]*)>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(svg)) !== null) {
      const attrs = this.parseSvgAttributes(match[2]);
      const rawZoneCode = attrs["data-zone-code"];
      const zoneCode = rawZoneCode
        ? this.normalizeZoneCode(rawZoneCode)
        : undefined;
      const seatNumber = attrs["data-seat-number"]?.trim();

      if (
        !zoneCode &&
        !seatNumber &&
        !attrs["data-ticket-name"] &&
        !attrs["data-zone-name"]
      ) {
        continue;
      }

      if (seatNumber) {
        if (!zoneCode) {
          throw new BadRequestException(
            "Each SVG seat must include data-zone-code and data-seat-number",
          );
        }

        const seatKey = `${zoneCode}:${seatNumber}`;
        if (seenSeats.has(seatKey)) {
          throw new BadRequestException(
            `Duplicate SVG seat number ${seatNumber} in zone ${zoneCode}`,
          );
        }

        seenSeats.add(seatKey);
        const seat: ParsedSeatMapSeat = {
          zoneCode,
          seatNumber,
          svgElementId: attrs.id,
        };
        seatsByZone.set(zoneCode, [...(seatsByZone.get(zoneCode) ?? []), seat]);
        continue;
      }

      const totalQuantity = attrs["data-total-quantity"]
        ? Number(attrs["data-total-quantity"])
        : undefined;
      const price = Number(attrs["data-price"]);

      if (!zoneCode || Number.isNaN(price) || price < 0) {
        throw new BadRequestException(
          "Each SVG ticket zone must include data-zone-code and data-price",
        );
      }

      if (
        totalQuantity !== undefined &&
        (!Number.isInteger(totalQuantity) || totalQuantity < 1)
      ) {
        throw new BadRequestException(
          "data-total-quantity must be a positive integer",
        );
      }

      if (zones.has(zoneCode)) {
        throw new BadRequestException(
          `Duplicate SVG data-zone-code: ${zoneCode}`,
        );
      }

      zones.set(zoneCode, {
        zoneCode,
        name: (
          attrs["data-ticket-name"] ??
          attrs["data-zone-name"] ??
          rawZoneCode
        ).trim(),
        price,
        maxPerUser: this.parseSvgPositiveInteger(
          attrs["data-max-per-user"] ?? "4",
          "data-max-per-user",
        ),
        svgElementId: attrs.id ?? zoneCode,
        declaredTotalQuantity: totalQuantity,
      });
    }

    if (zones.size === 0) {
      throw new BadRequestException(
        "SVG must contain at least one ticket zone with data-* ticket metadata",
      );
    }

    if (seenSeats.size === 0) {
      throw new BadRequestException(
        "SVG must contain seats with data-zone-code and data-seat-number",
      );
    }

    const ticketTypes = [...zones.values()].map((zone) => {
      const seats = seatsByZone.get(zone.zoneCode) ?? [];
      if (seats.length === 0) {
        throw new BadRequestException(
          `SVG zone ${zone.zoneCode} must contain at least one seat`,
        );
      }

      if (
        zone.declaredTotalQuantity !== undefined &&
        zone.declaredTotalQuantity !== seats.length
      ) {
        throw new BadRequestException(
          `SVG zone ${zone.zoneCode} data-total-quantity does not match seat count`,
        );
      }

      const { declaredTotalQuantity: _declaredTotalQuantity, ...ticketType } =
        zone;

      return {
        ...ticketType,
        totalQuantity: seats.length,
        seatNumbers: seats.map((seat) => seat.seatNumber),
      };
    });

    const unknownSeatZone = [...seatsByZone.keys()].find(
      (zoneCode) => !zones.has(zoneCode),
    );
    if (unknownSeatZone) {
      throw new BadRequestException(
        `SVG seat references unknown zone ${unknownSeatZone}`,
      );
    }

    return { ticketTypes, seats: [...seatsByZone.values()].flat() };
  }

  private sanitizeSeatMapSvg(svg: string): string {
    return svg.replace(
      /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g,
      (full, tagName: string, attrText: string) => {
        if (full.startsWith("</")) {
          return SVG_ALLOWED_TAGS.has(tagName) ? full : "";
        }

        if (!SVG_ALLOWED_TAGS.has(tagName)) {
          return "";
        }

        const attrs = this.parseSvgAttributes(attrText);
        const safeAttrs = Object.entries(attrs)
          .filter(
            ([name, value]) =>
              SVG_ALLOWED_ATTRIBUTES.has(name) &&
              !/^on/i.test(name) &&
              !/javascript:|data:text\/html/i.test(value),
          )
          .map(([name, value]) => `${name}="${this.escapeSvgAttribute(value)}"`)
          .join(" ");

        const selfClosing = full.endsWith("/>") ? " /" : "";
        return safeAttrs
          ? `<${tagName} ${safeAttrs}${selfClosing}>`
          : `<${tagName}${selfClosing}>`;
      },
    );
  }

  private parseSvgAttributes(attributeText: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(attributeText)) !== null) {
      attrs[match[1]] = match[3] ?? match[4] ?? "";
    }

    return attrs;
  }

  private parseSvgPositiveInteger(
    value: string,
    attributeName: string,
  ): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(
        `${attributeName} must be a positive integer`,
      );
    }

    return parsed;
  }

  private normalizeZoneCode(zoneCode: string): string {
    return zoneCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .slice(0, 50);
  }

  private escapeSvgAttribute(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
        orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
        include: {
          seatZones: {
            include: {
              ticketTypes: true,
            },
          },
          _count: {
            select: {
              tickets: true,
            },
          },
        },
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

  async findOne(idOrSlug: string): Promise<ConcertResponseDto> {
    const cacheKey = this.buildConcertDetailCacheKey(idOrSlug);
    const cached = await this.getCache<ConcertResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const concert = await this.prismaService.concert.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        seatZones: {
          include: {
            ticketTypes: true,
          },
        },
        guestList: {
          select: {
            fullName: true,
            guestType: true,
          },
          where: {
            status: "ACTIVE"
          }
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    const response = this.toResponse(concert);

    await this.setCache(cacheKey, response);

    return response;
  }

  async getReservedSeats(concertId: string) {
    const concert = await this.findConcertOrThrow(concertId);
    const resolvedId = concert.id;

    const seats = await this.prismaService.reservationSeat.findMany({
      where: {
        concertId: resolvedId,
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
      updateConcertDto.seatMapSvg = await this.uploadSeatMapSvgIfRaw(
        id,
        updateConcertDto.seatMapSvg,
      );
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
      throw new ConflictException("Only draft concerts can be published");
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
      throw new ConflictException("Completed concerts cannot be cancelled");
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
      throw new ConflictException("Only published concerts can be completed");
    }

    if (concert.eventDate.getTime() > Date.now()) {
      throw new BadRequestException(
        "Concert can only be completed after eventDate",
      );
    }

    const updatedConcert = await this.prismaService.concert.update({
      where: { id },
      data: { status: PrismaConcertStatus.COMPLETED },
    });

    await this.invalidateConcertCache(id);
    // TODO: emit audit log event: concert.completed.
    return this.toResponse(updatedConcert);
  }

  private async findConcertOrThrow(idOrSlug: string): Promise<Concert> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const concert = await this.prismaService.concert.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    return concert;
  }

  private validateEventDateInFuture(eventDate: Date): void {
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException("eventDate must be a valid date");
    }

    if (eventDate.getTime() <= Date.now()) {
      throw new BadRequestException("eventDate must be greater than now");
    }
  }

  private validatePublishable(concert: Concert): void {
    if (!concert.name.trim()) {
      throw new BadRequestException("Concert name is required");
    }

    if (!concert.venueName.trim()) {
      throw new BadRequestException("Concert venueName is required");
    }

    if (!concert.venueAddress.trim()) {
      throw new BadRequestException("Concert venueAddress is required");
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
          { name: { contains: keyword, mode: "insensitive" } },
          { artistName: { contains: keyword, mode: "insensitive" } },
          { venueName: { contains: keyword, mode: "insensitive" } },
        ],
      });
    }

    if (query.fromDate || query.toDate) {
      const eventDate: Prisma.DateTimeFilter<"Concert"> = {};

      if (query.fromDate) {
        eventDate.gte = this.parseDate(query.fromDate, "fromDate");
      }

      if (query.toDate) {
        eventDate.lte = this.parseDate(query.toDate, "toDate");
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
        "Cancelled or completed concerts cannot be updated",
      );
    }

    if (concert.status !== PrismaConcertStatus.PUBLISHED) {
      return;
    }

    const safePublishedFields: Array<keyof UpdateConcertDto> = [
      "description",
      "posterUrl",
      "seatMapSvg",
      "artistBio",
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

      if (dto.type !== undefined) {
        data.type = dto.type ? dto.type.trim() : null;
      }

      if (dto.city !== undefined) {
        data.city = dto.city ? dto.city.trim() : null;
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
        const eventDate = this.parseDate(dto.eventDate, "eventDate");
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

    const hash = createHash("sha1")
      .update(JSON.stringify(normalizedQuery))
      .digest("hex");

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
      this.logger.warn(
        `Failed to invalidate concert cache for ${concertId}`,
        error,
      );
    }
  }

  async createTicketType(concertId: string, dto: CreateTicketTypeDto) {
    const concert = await this.findConcertOrThrow(concertId);
    const resolvedId = concert.id;

    const zoneCode = dto.name.replace(/\s+/g, "-").toLowerCase();

    const ticketType = await this.prismaService.$transaction(async (tx) => {
      // 1. Find or create SeatZone
      let seatZone = await tx.seatZone.findFirst({
        where: { concertId: resolvedId, code: zoneCode },
      });

      if (!seatZone) {
        // Find existing seatZones count to pick a color
        const zonesCount = await tx.seatZone.count({ where: { concertId: resolvedId } });
        seatZone = await tx.seatZone.create({
          data: {
            concertId: resolvedId,
            code: zoneCode,
            name: dto.name.trim(),
            color: ["#e5484d", "#e0a82e", "#3d6f8f", "#123c3a", "#64748b"][
              zonesCount % 5
            ],
          },
        });
      }

      // 2. Create TicketType
      return tx.ticketType.create({
        data: {
          concertId: resolvedId,
          seatZoneId: seatZone.id,
          name: dto.name.trim(),
          price: dto.price,
          totalQuantity: dto.totalQuantity,
          remaining: dto.totalQuantity,
          maxPerUser: dto.maxPerUser,
          saleStartAt: dto.saleStartAt ? new Date(dto.saleStartAt) : null,
          saleEndAt: dto.saleEndAt ? new Date(dto.saleEndAt) : null,
          status: "ACTIVE",
        },
      });
    });

    await this.invalidateConcertCache(resolvedId);
    return ticketType;
  }

  async updateTicketType(
    concertId: string,
    ticketTypeId: string,
    dto: UpdateTicketTypeDto,
  ) {
    const concert = await this.findConcertOrThrow(concertId);
    const resolvedId = concert.id;

    const ticketType = await this.prismaService.ticketType.findFirst({
      where: { id: ticketTypeId, concertId: resolvedId },
    });

    if (!ticketType) {
      throw new NotFoundException("Ticket type not found");
    }

    const diff =
      dto.totalQuantity !== undefined
        ? dto.totalQuantity - ticketType.totalQuantity
        : 0;
    const newRemaining = ticketType.remaining + diff;
    if (newRemaining < 0) {
      throw new BadRequestException(
        "Cannot reduce total quantity below currently sold tickets",
      );
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      // 1. Update SeatZone if name changed
      if (dto.name && ticketType.seatZoneId) {
        try {
          const newCode = dto.name.replace(/\s+/g, "-").toLowerCase();
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
          saleStartAt:
            dto.saleStartAt !== undefined
              ? dto.saleStartAt
                ? new Date(dto.saleStartAt)
                : null
              : undefined,
          saleEndAt:
            dto.saleEndAt !== undefined
              ? dto.saleEndAt
                ? new Date(dto.saleEndAt)
                : null
              : undefined,
        },
      });
    });

    await this.invalidateConcertCache(resolvedId);
    return updated;
  }

  async deleteTicketType(concertId: string, ticketTypeId: string) {
    const concert = await this.findConcertOrThrow(concertId);
    const resolvedId = concert.id;

    const ticketType = await this.prismaService.ticketType.findFirst({
      where: { id: ticketTypeId, concertId: resolvedId },
    });

    if (!ticketType) {
      throw new NotFoundException("Ticket type not found");
    }

    const ticketsCount = await this.prismaService.ticket.count({
      where: { ticketTypeId },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException(
        "Cannot delete ticket type that already has purchased tickets",
      );
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

    await this.invalidateConcertCache(resolvedId);
    return { success: true };
  }
}
