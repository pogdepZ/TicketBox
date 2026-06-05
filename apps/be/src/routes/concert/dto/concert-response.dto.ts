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
  createdAt: Date;
  updatedAt: Date;

  constructor(concert: Concert) {
    this.id = concert.id;
    this.name = concert.name;
    this.description = concert.description;
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
    this.createdAt = concert.createdAt;
    this.updatedAt = concert.updatedAt;
  }
}
