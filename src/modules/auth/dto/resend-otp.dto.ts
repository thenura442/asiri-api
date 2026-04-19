import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ example: '+94771234567' })
  @IsString()
  phone!: string;
}