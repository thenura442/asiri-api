import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  displayName: string;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private nominatimUrl: string;

  constructor(private config: ConfigService) {
    this.nominatimUrl = this.config.get<string>('nominatim.baseUrl')
      ?? 'https://nominatim.openstreetmap.org';
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<ReverseGeocodeResult> {
    try {
      const url = `${this.nominatimUrl}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AsiriMobileLaboratory/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

      const data = await res.json();
      const addr = data.address ?? {};

      return {
        address: [
          addr.house_number,
          addr.road,
          addr.suburb,
        ].filter(Boolean).join(', '),
        city: addr.city ?? addr.town ?? addr.village ?? '',
        district: addr.state_district ?? addr.county ?? '',
        province: addr.state ?? '',
        postalCode: addr.postcode ?? '',
        displayName: data.display_name ?? '',
      };
    } catch (err) {
      this.logger.warn(`Reverse geocode failed: ${err}`);
      return {
        address: '',
        city: '',
        district: '',
        province: '',
        postalCode: '',
        displayName: `${lat}, ${lng}`,
      };
    }
  }

  async calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): Promise<number> {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}