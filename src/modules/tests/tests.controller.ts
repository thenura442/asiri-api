import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { FilterTestsDto } from './dto/filter-tests.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new test (SA only)' })
  create(@Body() dto: CreateTestDto) {
    return this.testsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tests with filters' })
  findAll(@Query() dto: FilterTestsDto) {
    return this.testsService.findAll(dto);
  }

  @Get('catalog')
  @Public()
  @ApiOperation({ summary: 'Get active tests catalog (public — for mobile booking)' })
  getCatalog() {
    return this.testsService.getCatalog();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.testsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update test (SA only)' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateTestDto,
  ) {
    return this.testsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle test active/inactive (SA only)' })
  @ApiParam({ name: 'id', type: String })
  toggleActive(@Param('id', ParseUuidPipe) id: string) {
    return this.testsService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete test (SA only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.testsService.remove(id);
  }
}