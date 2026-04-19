import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectJobDto {
  @ApiProperty({ example: 'No available staff at this time' })
  @IsString()
  @MinLength(5)
  reason!: string;
}