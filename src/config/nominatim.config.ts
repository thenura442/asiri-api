import { registerAs } from '@nestjs/config';

export default registerAs('nominatim', () => ({
  baseUrl: process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
}));