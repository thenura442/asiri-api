import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiry: process.env.JWT_EXPIRY ?? '24h',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
}));