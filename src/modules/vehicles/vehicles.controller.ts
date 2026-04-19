import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new vehicle (SA only)' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles with filters' })
  findAll(@Query() dto: FilterVehiclesDto, @CurrentUser() user: any) {
    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
    return this.vehiclesService.findAll(dto, user?.branchId, isSuperAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  // POST (not PATCH) — matches integration map
  @Post(':id/assign-driver')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Assign or unassign driver to vehicle' })
  @ApiParam({ name: 'id', type: String })
  assignDriver(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.vehiclesService.assignDriver(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete vehicle (SA only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}