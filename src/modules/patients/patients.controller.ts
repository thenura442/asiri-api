import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { FilterPatientsDto } from './dto/filter-patients.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FRONT_OFFICE,
    UserRole.LAB_MANAGER,
  )
  @ApiOperation({ summary: 'Create a new patient' })
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients with filters' })
  findAll(@Query() dto: FilterPatientsDto) {
    return this.patientsService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FRONT_OFFICE,
    UserRole.LAB_MANAGER,
  )
  @ApiOperation({ summary: 'Update patient' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.update(id, dto, user?.role);
  }

  @Patch(':id/uhid')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FRONT_OFFICE,
    UserRole.LAB_MANAGER,
  )
  @ApiOperation({ summary: 'Assign UHID to patient' })
  @ApiParam({ name: 'id', type: String })
  assignUhid(
    @Param('id', ParseUuidPipe) id: string,
    @Body('uhid') uhid: string,
  ) {
    return this.patientsService.assignUhid(id, uhid);
  }

  @Patch(':id/flag')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FRONT_OFFICE,
    UserRole.LAB_MANAGER,
  )
  @ApiOperation({ summary: 'Update patient flag' })
  @ApiParam({ name: 'id', type: String })
  updateFlag(
    @Param('id', ParseUuidPipe) id: string,
    @Body('flag') flag: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.updateFlag(id, flag, user?.role);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete patient (SA only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.patientsService.remove(id);
  }
}