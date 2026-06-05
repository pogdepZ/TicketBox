import {
  ArtistBioStatus as PrismaArtistBioStatus,
  ConcertStatus as PrismaConcertStatus,
} from '../../../generated/prisma';

export enum ConcertStatus {
  Draft = 'draft',
  Published = 'published',
  Cancelled = 'cancelled',
  Completed = 'completed',
}

export enum ArtistBioStatus {
  Empty = 'empty',
  Processing = 'processing',
  Done = 'done',
  Failed = 'failed',
}

export const toPrismaConcertStatus = (
  status: ConcertStatus,
): PrismaConcertStatus => {
  const map: Record<ConcertStatus, PrismaConcertStatus> = {
    [ConcertStatus.Draft]: PrismaConcertStatus.DRAFT,
    [ConcertStatus.Published]: PrismaConcertStatus.PUBLISHED,
    [ConcertStatus.Cancelled]: PrismaConcertStatus.CANCELLED,
    [ConcertStatus.Completed]: PrismaConcertStatus.COMPLETED,
  };

  return map[status];
};

export const fromPrismaConcertStatus = (
  status: PrismaConcertStatus,
): ConcertStatus => {
  const map: Record<PrismaConcertStatus, ConcertStatus> = {
    [PrismaConcertStatus.DRAFT]: ConcertStatus.Draft,
    [PrismaConcertStatus.PUBLISHED]: ConcertStatus.Published,
    [PrismaConcertStatus.CANCELLED]: ConcertStatus.Cancelled,
    [PrismaConcertStatus.COMPLETED]: ConcertStatus.Completed,
  };

  return map[status];
};

export const fromPrismaArtistBioStatus = (
  status: PrismaArtistBioStatus,
): ArtistBioStatus => {
  const map: Record<PrismaArtistBioStatus, ArtistBioStatus> = {
    [PrismaArtistBioStatus.EMPTY]: ArtistBioStatus.Empty,
    [PrismaArtistBioStatus.PROCESSING]: ArtistBioStatus.Processing,
    [PrismaArtistBioStatus.DONE]: ArtistBioStatus.Done,
    [PrismaArtistBioStatus.FAILED]: ArtistBioStatus.Failed,
  };

  return map[status];
};
