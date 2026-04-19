import { IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CancelledBy } from '../../../common/enums/cancelled-by.enum';

export class CancelJobDto {
  @ApiProperty({ enum: CancelledBy })
  @IsEnum(CancelledBy)
  cancelledBy!: CancelledBy;

  @ApiProperty({ example: 'Patient not available' })
  @IsString()
  @MinLength(5)
  reason!: string;
}