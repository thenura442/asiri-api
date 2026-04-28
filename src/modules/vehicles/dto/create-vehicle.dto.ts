import {
  IsString, IsEnum, IsOptional,
  IsInt, IsUUID, Min, Max, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

export class CreateVehicleDto {
  @ApiProperty({ example: 'WP CAB-4521' })
  @IsString()
  plateNumber!: string;

  @ApiProperty({ example: 'MHF15FJ3XBK123456' })
  @IsString()
  chassisNumber!: string;

  @ApiPropertyOptional({ example: 'AS-MOB-45' })
  @IsOptional()
  @IsString()
  vehicleIdCode?: string;

  @ApiPropertyOptional({ example: 'Toyota HiAce KDH 201' })
  @IsOptional()
  @IsString()
  makeModel?: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2030)
  yearOfManufacture?: number;

  @ApiPropertyOptional({ example: 'White' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ example: 'uuid-of-lab-branch' })
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // ── Insurance & service fields ────────────────────────────

  @ApiPropertyOptional({ example: 'Sri Lanka Insurance Corporation' })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional({ example: '2027-03-15' })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional()
  @IsDateString()
  revenueLicExpiry?: string;

  @ApiPropertyOptional({ example: '2025-12-01' })
  @IsOptional()
  @IsDateString()
  lastServiceDate?: string;

  @ApiPropertyOptional({ example: 45000, description: 'Current mileage in km' })
  @IsOptional()
  @IsInt()
  mileageKm?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Mileage at which next service is due' })
  @IsOptional()
  @IsInt()
  nextServiceKm?: number;

  @ApiPropertyOptional({ example: 'https://storage.supabase.co/...' })
  @IsOptional()
  @IsString()
  insuranceCertUrl?: string;
}