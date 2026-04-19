import {
  Controller, Get, Patch, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Settings')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings (SA only)' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get setting by key (SA only)' })
  @ApiParam({ name: 'key', type: String })
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a setting value (SA only)' })
  @ApiParam({ name: 'key', type: String })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.update(key, dto.value, user?.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple settings at once (SA only)' })
  updateMany(
    @Body() settings: { key: string; value: string }[],
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateMany(settings, user?.id);
  }
}