import { SetMetadata } from '@nestjs/common';

export type ClientType = 'admin' | 'customer' | 'driver';
export const CLIENT_TYPE_KEY = 'clientType';
export const ClientType = (type: ClientType) => SetMetadata(CLIENT_TYPE_KEY, type);