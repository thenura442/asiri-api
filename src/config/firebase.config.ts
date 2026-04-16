import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
}));