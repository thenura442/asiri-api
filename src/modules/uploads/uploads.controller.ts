import {
  Controller, Get, Post, Param,
  UploadedFile, UseInterceptors, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { StorageService } from '../../core/storage/storage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly storage: StorageService,
  ) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile avatar' })
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.uploadsService.uploadAvatar(file, user?.id);
  }

  // No path params — matches integration map §16.1
  @Post('prescription')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload prescription (§16.1)' })
  @ApiQuery({ name: 'jobId', required: false })
  uploadPrescription(
    @UploadedFile() file: Express.Multer.File,
    @Query('jobId') jobId?: string,
  ) {
    return this.uploadsService.uploadPrescription(file, jobId ?? 'pending');
  }

  // type in query (not path) — matches integration map §16.2
  @Post('driver-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload driver document (§16.2)' })
  @ApiQuery({ name: 'driverId', required: true })
  @ApiQuery({ name: 'type', enum: ['license_photo', 'id_front', 'id_back'] })
  uploadDriverDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('driverId') driverId: string,
    @Query('type') docType: string,
  ) {
    return this.uploadsService.uploadDriverDocument(file, driverId, docType);
  }

  // No path params — matches integration map §16.3
  @Post('lab-report')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload lab report PDF (§16.3)' })
  @ApiQuery({ name: 'jobId', required: true })
  @ApiQuery({ name: 'testId', required: true })
  uploadLabReport(
    @UploadedFile() file: Express.Multer.File,
    @Query('jobId') jobId: string,
    @Query('testId') testId: string,
  ) {
    return this.uploadsService.uploadLabReport(file, jobId, testId);
  }

  // New — matches integration map §16.4
  @Get('signed-url')
  @ApiOperation({ summary: 'Get a fresh signed URL for any stored file (§16.4)' })
  @ApiQuery({ name: 'key', description: 'Storage path e.g. driver-documents/abc.jpg' })
  @ApiQuery({ name: 'bucket', required: false })
  async getSignedUrl(
    @Query('key') key: string,
    @Query('bucket') bucket?: string,
  ) {
    // Determine bucket from key prefix if not specified
    const resolvedBucket = bucket ?? this.resolveBucket(key);
    const signedUrl = await this.storage.getSignedUrl(resolvedBucket, key, 3600);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    return { signedUrl, expiresAt };
  }

  private resolveBucket(key: string): string {
    if (key.startsWith('driver-documents/')) return 'driver-documents';
    if (key.startsWith('prescriptions/')) return 'prescriptions';
    if (key.startsWith('lab-reports/')) return 'lab-reports';
    if (key.startsWith('issues/')) return 'issues';
    return 'avatars';
  }
}