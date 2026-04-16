import { registerAs } from '@nestjs/config';

export default registerAs('osrm', () => ({
  baseUrl: process.env.OSRM_BASE_URL ?? 'http://router.project-osrm.org',
  fallbackToHaversine: process.env.OSRM_FALLBACK_TO_HAVERSINE === 'true',
}));