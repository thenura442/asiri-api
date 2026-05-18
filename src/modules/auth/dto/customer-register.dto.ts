import {
  IsString, IsEmail, IsOptional, IsEnum,
  IsDateString, IsBoolean, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../common/enums/gender.enum';
import { BloodGroup } from '../../../common/enums/blood-group.enum';

export class CustomerRegisterDto {
  // ── Step 1 — Personal ────────────────────────────────────────────────────
  @ApiProperty({ example: 'Kamala Silva' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '1990-06-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ example: '200123456789' })
  @IsString()
  nic!: string;

  @ApiPropertyOptional({ enum: BloodGroup, nullable: true })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup | null;

  // ── Step 2 — Contact ─────────────────────────────────────────────────────
  @ApiProperty({ example: '+94771234567' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string | null;

  @ApiProperty({ example: '45, Main Street, Colombo 10' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @IsString()
  district?: string;

  // ── Step 3 — Security ────────────────────────────────────────────────────
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enableBiometric?: boolean;

  @ApiProperty()
  @IsBoolean()
  acceptedTerms!: boolean;
}