import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveEscalationDto {
  @ApiProperty({ example: 'Dispatched backup vehicle from nearest branch' })
  @IsString()
  @MinLength(10)
  resolutionNotes!: string;
}