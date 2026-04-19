import {
  IsString, IsEnum, IsOptional,
  IsUUID, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EscalationCategory } from '../../../common/enums/escalation-category.enum';
import { EscalationUrgency } from '../../../common/enums/escalation-urgency.enum';

export class CreateEscalationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobRequestId?: string;

  @ApiProperty({ enum: EscalationCategory })
  @IsEnum(EscalationCategory)
  reasonCategory!: EscalationCategory;

  @ApiProperty({ example: 'Vehicle broke down en route to patient' })
  @IsString()
  @MinLength(10)
  details!: string;

  @ApiPropertyOptional({ enum: EscalationUrgency, default: EscalationUrgency.NORMAL })
  @IsOptional()
  @IsEnum(EscalationUrgency)
  urgency?: EscalationUrgency;
}