import {
  ArtistBioStatus as PrismaArtistBioStatus,
  Concert,
  ConcertStatus as PrismaConcertStatus,
} from '../../../generated/prisma';
import {
  ArtistBioStatus,
  ConcertStatus,
  fromPrismaArtistBioStatus,
  fromPrismaConcertStatus,
} from '../types/concert-status.type';

export class ConcertResponseDto {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  city: string | null;
  artistName: string | null;
  artistBio: string | null;
  artistBioStatus: ArtistBioStatus;
  venueName: string;
  venueAddress: string;
  eventDate: Date;
  seatMapSvg: string | null;
  posterUrl: string | null;
  status: ConcertStatus;
  createdBy: string | null;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  capacity: number;
  ticketsSold: number;
  seatZones?: any[];
  guestList?: any[];

  constructor(concert: Concert) {
    this.id = concert.id;
    this.name = concert.name;
    this.description = concert.description;
    this.type = concert.type;
    this.city = concert.city;
    this.artistName = concert.artistName;
    this.artistBio = concert.artistBio;
    this.artistBioStatus = fromPrismaArtistBioStatus(
      concert.artistBioStatus as PrismaArtistBioStatus,
    );
    this.venueName = concert.venueName;
    this.venueAddress = concert.venueAddress;
    this.eventDate = concert.eventDate;
    this.seatMapSvg = concert.seatMapSvgUrl;
    this.posterUrl = concert.posterUrl;
    this.status = fromPrismaConcertStatus(concert.status as PrismaConcertStatus);
    this.createdBy = concert.createdById;
    this.slug = concert.slug;
    this.createdAt = concert.createdAt;
    this.updatedAt = concert.updatedAt;
    this.seatZones = (concert as any).seatZones;
    this.guestList = (concert as any).guestList;

    // Calculate total capacity from all ticket types inside all seat zones
    const zones = (concert as any).seatZones || [];
    let totalCapacity = 0;
    for (const zone of zones) {
      const tts = zone.ticketTypes || [];
      for (const tt of tts) {
        totalCapacity += tt.totalQuantity ?? 0;
      }
    }
    this.capacity = totalCapacity;

    // Retrieve ticketsSold count from Prisma _count select object
    this.ticketsSold = (concert as any)._count?.tickets ?? 0;
  }
}
