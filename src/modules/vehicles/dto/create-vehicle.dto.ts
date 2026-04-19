import {
  IsString, IsEnum, IsOptional, IsNumber,
  IsInt, IsUUID, Min, Max,
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
}