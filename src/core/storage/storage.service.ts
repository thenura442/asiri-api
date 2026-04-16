import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { STORAGE_BUCKETS } from '../../common/constants/storage-buckets.constant';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private supabase: SupabaseService) {}

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabase.adminClient.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) throw new Error(`Upload failed: ${error.message}`);
    return path;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.adminClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const { data } = this.supabase.adminClient.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.adminClient.storage
      .from(bucket)
      .remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  getBuckets() {
    return STORAGE_BUCKETS;
  }
}