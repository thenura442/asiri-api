import {
  IsString, IsOptional, IsEmail,
  IsDateString, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  nic!: string;

  @ApiProperty()
  @IsString()
  licenseNumber!: string;

  @ApiProperty()
  @IsDateString()
  licenseExpiry!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licensePhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idFrontUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idBackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}