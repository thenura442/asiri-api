import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDriverDto {
  @ApiPropertyOptional({ description: 'Driver ID to assign. Send null to unassign.' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}