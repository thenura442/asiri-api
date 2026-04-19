import {
  IsString, IsOptional, IsEnum, IsBoolean,
  IsDateString, IsUUID, IsNumber, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Urgency } from '../../../common/enums/urgency.enum';

export class CreateBookingDto {
  @ApiProperty({ example: ['uuid-test-1', 'uuid-test-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  testIds!: string[];

  @ApiProperty({ example: '45, Main Street, Colombo 10' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 6.9271 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 79.8612 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ enum: Urgency, default: Urgency.NORMAL })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional({ example: '2026-04-15T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prescriptionUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isExternalTransport?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  externalTransportFare?: number;

  @ApiPropertyOptional({ example: 'uuid-of-saved-address' })
  @IsOptional()
  @IsUUID()
  savedAddressId?: string;
}