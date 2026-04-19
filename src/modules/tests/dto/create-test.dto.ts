import {
  IsString, IsOptional, IsEnum,
  IsNumber, IsBoolean, IsInt, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SampleType } from '../../../common/enums/sample-type.enum';

export class CreateTestDto {
  @ApiProperty({ example: 'Full Blood Count' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'FBC-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ enum: SampleType })
  @IsEnum(SampleType)
  sampleType!: SampleType;

  @ApiPropertyOptional({ example: '4-6 hrs' })
  @IsOptional()
  @IsString()
  turnaroundTime?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  prescriptionReq?: boolean;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeSensitivityHrs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}