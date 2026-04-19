import {
  IsString, IsOptional, IsEnum,
  IsBoolean, IsDateString, IsUUID,
  IsNumber, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency } from '../../../common/enums/urgency.enum';

export class CreateJobDto {
  @ApiProperty({ example: 'uuid-of-patient' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: '45, Main Street, Colombo 10' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 6.9271 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 79.8612 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: ['uuid-of-test-1', 'uuid-of-test-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  testIds!: string[];

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

  @ApiPropertyOptional({ example: 'https://storage.../prescription.pdf' })
  @IsOptional()
  @IsString()
  prescriptionUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isExternalTransport?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  externalTransportFare?: number;
}