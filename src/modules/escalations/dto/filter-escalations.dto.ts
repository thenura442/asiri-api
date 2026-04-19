import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EscalationUrgency } from '../../../common/enums/escalation-urgency.enum';

export class FilterEscalationsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EscalationUrgency })
  @IsOptional()
  @IsEnum(EscalationUrgency)
  urgency?: EscalationUrgency;

  @ApiPropertyOptional({ enum: ['open', 'acknowledged', 'resolved'] })
  @IsOptional()
  @IsEnum(['open', 'acknowledged', 'resolved'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}