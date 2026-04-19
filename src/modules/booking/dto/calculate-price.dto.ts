import { IsArray, IsUUID, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculatePriceDto {
  @ApiProperty({ example: ['uuid-test-1', 'uuid-test-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  testIds!: string[];

  @ApiProperty({ example: 5.2 })
  @Type(() => Number)
  @IsNumber()
  distanceKm!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isExternalTransport?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  externalTransportFare?: number;
}