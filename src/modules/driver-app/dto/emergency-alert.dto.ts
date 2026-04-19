import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmergencyAlertDto {
  @ApiProperty({ example: 'Vehicle breakdown on Galle Road' })
  @IsString()
  @MinLength(10)
  details!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobRequestId?: string;

  @ApiPropertyOptional({ example: 6.9271 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 79.8612 })
  @IsOptional()
  longitude?: number;
}