import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient;
  public readonly adminClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('supabase.url')!;
    const anonKey = this.config.get<string>('supabase.anonKey')!;
    const serviceKey = this.config.get<string>('supabase.serviceRoleKey')!;

    this.client = createClient(url, anonKey);
    this.adminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}