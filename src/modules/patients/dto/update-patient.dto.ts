import { PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PatientFlag } from '../../../common/enums/patient-flag.enum';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @ApiPropertyOptional({ enum: PatientFlag })
  @IsOptional()
  @IsEnum(PatientFlag)
  flag?: PatientFlag;

  @ApiPropertyOptional({ example: 'UHID-2026-001' })
  @IsOptional()
  @IsString()
  uhid?: string;
}