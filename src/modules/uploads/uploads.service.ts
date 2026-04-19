import 'multer';
import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from '../../core/storage/storage.service';
import { STORAGE_BUCKETS } from '../../common/constants/storage-buckets.constant';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  constructor(private storage: StorageService) {}

  private validateFile(
    file: Express.Multer.File,
    allowedTypes: string[],
    maxSizeMb: number,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      );
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`File too large. Max size: ${maxSizeMb}MB`);
    }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    this.validateFile(file, ['image/jpeg', 'image/png'], 5);
    const ext = file.mimetype.split('/')[1];
    const path = `${userId}/avatar-${uuidv4()}.${ext}`;
    await this.storage.uploadFile(STORAGE_BUCKETS.AVATARS, path, file.buffer, file.mimetype);
    const url = await this.storage.getPublicUrl(STORAGE_BUCKETS.AVATARS, path);
    return { url, avatarUrl: url };
  }

  async uploadPrescription(file: Express.Multer.File, jobId: string) {
    this.validateFile(file, ['image/jpeg', 'image/png', 'application/pdf'], 10);
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.split('/')[1];
    const path = `${jobId}/prescription-${uuidv4()}.${ext}`;
    await this.storage.uploadFile(STORAGE_BUCKETS.PRESCRIPTIONS, path, file.buffer, file.mimetype);
    const url = await this.storage.getSignedUrl(STORAGE_BUCKETS.PRESCRIPTIONS, path, 86400);
    return { url, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype };
  }

  async uploadDriverDocument(
    file: Express.Multer.File,
    driverId: string,
    docType: string,
  ) {
    this.validateFile(file, ['image/jpeg', 'image/png'], 10);
    const ext = file.mimetype.split('/')[1];
    const path = `${driverId}/${docType}-${uuidv4()}.${ext}`;
    await this.storage.uploadFile(STORAGE_BUCKETS.DRIVER_DOCUMENTS, path, file.buffer, file.mimetype);
    const url = await this.storage.getSignedUrl(STORAGE_BUCKETS.DRIVER_DOCUMENTS, path);
    return { url };
  }

  async uploadLabReport(file: Express.Multer.File, jobId: string, testId: string) {
    this.validateFile(file, ['application/pdf'], 25);
    const path = `${jobId}/${testId}-report-${uuidv4()}.pdf`;
    await this.storage.uploadFile(STORAGE_BUCKETS.LAB_REPORTS, path, file.buffer, file.mimetype);
    const url = await this.storage.getSignedUrl(STORAGE_BUCKETS.LAB_REPORTS, path, 1800);
    return { url };
  }
}