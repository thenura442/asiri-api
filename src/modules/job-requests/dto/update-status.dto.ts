import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../../../common/enums/job-status.enum';

export class UpdateStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status!: JobStatus;

  @ApiPropertyOptional({ example: 'Reason if required' })
  @IsOptional()
  @IsString()
  reason?: string;
}