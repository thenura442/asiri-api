import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleAvailabilityDto {
  @ApiProperty({ description: 'true = online, false = offline' })
  @IsBoolean()
  isOnline!: boolean;

  get isAvailable(): boolean {
    return this.isOnline;
  }
}