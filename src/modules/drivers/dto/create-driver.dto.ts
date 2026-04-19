import {
  IsString, IsOptional, IsEmail,
  IsDateString, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'Nimal Perera' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '200123456789' })
  @IsString()
  nic!: string;

  @ApiProperty({ example: 'B1234567' })
  @IsString()
  licenseNumber!: string;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  licenseExpiry!: string;

  @ApiProperty({ example: '+94 77 123 4567' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'nimal@asiri-labs.lk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '45, Main Street, Colombo 10' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'uuid-of-lab-branch' })
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}