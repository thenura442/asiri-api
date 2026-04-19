import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new admin user (SA only)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with filters (SA only)' })
  findAll(@Query() dto: FilterUsersDto) {
    return this.usersService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (SA only)' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (SA only)' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  // POST (not PATCH) — matches integration map
  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock locked account (SA only)' })
  @ApiParam({ name: 'id', type: String })
  unlock(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.unlock(id);
  }

  // POST (not PATCH) — matches integration map
  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Force password reset for user (SA only)' })
  @ApiParam({ name: 'id', type: String })
  resetPassword(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.resetPassword(id, 'TempPass@123');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (SA only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.remove(id);
  }
}