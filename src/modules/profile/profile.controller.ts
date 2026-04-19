import {
  Controller, Get, Patch, Post, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get my profile' })
  getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user?.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my profile' })
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: any,
  ) {
    return this.profileService.updateProfile(user?.id, dto);
  }

  // POST (not PATCH) — matches integration map
  @Post('change-password')
  @ApiOperation({ summary: 'Change my password' })
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.profileService.changePassword(user?.id, dto);
  }

  @Get('branch-status')
  @ApiOperation({ summary: 'Get my branch online status' })
  getBranchStatus(@CurrentUser() user: any) {
    return this.profileService.getBranchStatus(user?.id);
  }

  // New — matches integration map
  @Post('logout-all')
  @ApiOperation({ summary: 'Force logout all other sessions' })
  logoutAll(@CurrentUser() user: any) {
    return this.profileService.logoutAll(user?.id);
  }
}