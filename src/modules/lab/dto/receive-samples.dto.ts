import { IsArray, IsUUID, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SampleItemDto {
  @ApiProperty()
  @IsUUID()
  jobRequestTestId!: string;

  @ApiProperty()
  @IsBoolean()
  received!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notReceivedReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveSamplesDto {
  @ApiProperty()
  @IsUUID()
  jobRequestId!: string;

  @ApiProperty({ type: [SampleItemDto] })
  @IsArray()
  samples?: SampleItemDto[];

  // Legacy support — list of IDs
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  jobRequestTestIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overallNotes?: string;
}