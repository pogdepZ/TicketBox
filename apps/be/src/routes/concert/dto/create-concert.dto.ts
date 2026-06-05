import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateConcertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artistName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  venueName!: string;

  @IsString()
  @IsNotEmpty()
  venueAddress!: string;

  @IsISO8601()
  eventDate!: string;

  @IsOptional()
  @IsString()
  seatMapSvg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  // Intentionally not using @IsUrl so local/mock paths can be accepted during storage integration.
  posterUrl?: string;
}
