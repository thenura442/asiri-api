import {
  IsString, IsOptional, IsEmail,
  IsDateString, IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../common/enums/gender.enum';
import { BloodGroup } from '../../../common/enums/blood-group.enum';

export class CreatePatientDto {
  @ApiProperty({ example: 'Kamala Silva' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '200123456789' })
  @IsString()
  nic!: string;

  @ApiProperty({ example: '1985-06-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ example: '+94 77 123 4567' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'kamala@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'Sri Lankan' })
  @IsOptional()
  @IsString()
  nationality?: string;

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

  @ApiPropertyOptional({ example: '00100' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Near Colombo Fort station' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ example: 'Sunil Silva' })
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional({ example: '+94 77 987 6543' })
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional({ example: 'Penicillin, Aspirin' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Diabetes, Hypertension' })
  @IsOptional()
  @IsString()
  existingConditions?: string;
}