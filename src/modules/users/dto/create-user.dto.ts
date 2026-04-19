import {
  IsString, IsEnum, IsOptional, IsEmail,
  IsBoolean, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Kamala Perera' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'kamala@asiri-labs.lk' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString()
  password!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ example: 'uuid-of-branch' })
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional({ example: 'STF-001' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ example: '200123456789' })
  @IsOptional()
  @IsString()
  nic?: string;

  @ApiPropertyOptional({ example: '+94 77 123 4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior Technician' })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ example: 'Biochemistry' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'BSc Medical Lab Technology' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}