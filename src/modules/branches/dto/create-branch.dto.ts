import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsNumber, IsEmail, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchType } from '../../../common/enums/branch-type.enum';

export class CreateBranchDto {
  @ApiProperty({ example: 'Asiri Nugegoda Branch' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: BranchType })
  @IsEnum(BranchType)
  type!: BranchType;

  @ApiProperty({ example: '45, High Level Road, Nugegoda' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 6.8721 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 79.8897 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 'BR-NUG-01' })
  @IsOptional()
  @IsString()
  branchCode?: string;

  @ApiPropertyOptional({ example: '+94 11 234 5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'nugegoda@asiri-labs.lk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  serviceRadiusKm?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  maxDailyCapacity?: number;

  @ApiPropertyOptional({ example: 'Dr. Perera' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ example: '+94 77 123 4567' })
  @IsOptional()
  @IsString()
  managerPhone?: string;

  @ApiPropertyOptional({ description: 'Required if type is collecting_center' })
  @IsOptional()
  @IsString()
  defaultLabId?: string;

  @ApiPropertyOptional({ example: '06:30' })
  @IsOptional()
  @IsString()
  operatingStart?: string;

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @IsString()
  operatingEnd?: string;

  @ApiPropertyOptional({ example: 'Western' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @IsString()
  district?: string;
}