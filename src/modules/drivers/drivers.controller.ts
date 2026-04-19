import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { FilterDriversDto } from './dto/filter-drivers.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Register a new driver' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all drivers with filters' })
  findAll(@Query() dto: FilterDriversDto, @CurrentUser() user: any) {
    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
    return this.driversService.findAll(dto, user?.branchId, isSuperAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Update driver' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto);
  }

  @Patch(':id/documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Update driver document URLs' })
  @ApiParam({ name: 'id', type: String })
  updateDocuments(
    @Param('id', ParseUuidPipe) id: string,
    @Body() docs: {
      licenseDocUrl?: string;
      nicFrontUrl?: string;
      nicBackUrl?: string;
      avatarUrl?: string;
    },
  ) {
    return this.driversService.updateDocuments(id, docs);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete driver (SA only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.driversService.remove(id);
  }
}