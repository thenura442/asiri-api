import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDriverSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['google_maps', 'apple_maps', 'waze'] })
  @IsOptional()
  @IsString()
  @IsIn(['google_maps', 'apple_maps', 'waze'])
  defaultMapsApp?: string;
}