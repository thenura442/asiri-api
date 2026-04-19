import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PatientFlag } from '../../../common/enums/patient-flag.enum';
import { Gender } from '../../../common/enums/gender.enum';

export class FilterPatientsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PatientFlag })
  @IsOptional()
  @IsEnum(PatientFlag)
  flag?: PatientFlag;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}