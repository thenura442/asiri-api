import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AllocateJobDto {
  @ApiProperty({ example: 'uuid-of-driver' })
  @IsUUID()
  driverId!: string;

  @ApiProperty({ example: 'uuid-of-vehicle' })
  @IsUUID()
  vehicleId!: string;
}