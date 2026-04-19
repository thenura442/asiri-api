import { IsString, IsUUID, IsArray, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportIssueDto {
  @ApiProperty()
  @IsUUID()
  jobRequestId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobRequestTestId?: string;

  @ApiProperty({ example: 'insufficient_quantity' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'Sample was haemolyzed' })
  @IsString()
  @MinLength(5)
  details!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  affectedTestIds?: string[];

  // Legacy field
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}