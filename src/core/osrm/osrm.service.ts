import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { haversineDistance } from '../../common/utils/haversine.util';

export interface RouteResult {
  distanceKm: number;
  durationSec: number;
  source: 'osrm' | 'haversine';
}

@Injectable()
export class OsrmService {
  private readonly logger = new Logger(OsrmService.name);
  private baseUrl: string;
  private fallback: boolean;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('osrm.baseUrl')!;
    this.fallback = this.config.get<boolean>('osrm.fallbackToHaversine') ?? true;
  }

  async getRoute(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): Promise<RouteResult> {
    try {
      const url = `${this.baseUrl}/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) throw new Error('No route returned');
      return {
        distanceKm: route.distance / 1000,
        durationSec: route.duration,
        source: 'osrm',
      };
    } catch (err) {
      this.logger.warn(`OSRM failed, falling back to Haversine: ${err}`);
      if (!this.fallback) throw err;
      const distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
      return {
        distanceKm,
        durationSec: (distanceKm / 30) * 3600,
        source: 'haversine',
      };
    }
  }
}