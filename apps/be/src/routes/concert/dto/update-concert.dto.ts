import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateConcertDto } from './create-concert.dto';

export class UpdateConcertDto extends PartialType(CreateConcertDto) {
  @IsOptional()
  @IsString()
  artistBio?: string;
}
