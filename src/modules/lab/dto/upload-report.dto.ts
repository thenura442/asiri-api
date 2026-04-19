import { IsString, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadReportDto {
  @ApiProperty()
  @IsUUID()
  jobRequestTestId!: string;

  @ApiProperty({ example: 'https://storage.../report.pdf' })
  @IsString()
  reportUrl!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCriticalValue?: boolean;
}