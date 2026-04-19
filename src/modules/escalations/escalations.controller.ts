import {
  Controller, Get, Post, Patch,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';
import { FilterEscalationsDto } from './dto/filter-escalations.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Escalations')
@ApiBearerAuth()
@Controller('escalations')
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new escalation' })
  create(
    @Body() dto: CreateEscalationDto,
    @CurrentUser() user: any,
  ) {
    return this.escalationsService.create(dto, user?.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Get all escalations (SA/LM only)' })
  findAll(@Query() dto: FilterEscalationsDto) {
    return this.escalationsService.findAll(dto);
  }

  @Patch(':id/acknowledge')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Acknowledge escalation (SA only)' })
  @ApiParam({ name: 'id', type: String })
  acknowledge(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.escalationsService.acknowledge(id, user?.id);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve escalation (SA only)' })
  @ApiParam({ name: 'id', type: String })
  resolve(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ResolveEscalationDto,
    @CurrentUser() user: any,
  ) {
    return this.escalationsService.resolve(id, dto, user?.id);
  }
}