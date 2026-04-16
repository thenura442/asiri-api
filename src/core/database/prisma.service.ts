import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const softDeleteModels = [
  'User', 'Branch', 'Vehicle', 'Driver',
  'Patient', 'Test', 'JobRequest',
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ['warn', 'error'] });

    this.$use(async (params, next) => {
      if (softDeleteModels.includes(params.model ?? '')) {
        if (['findFirst', 'findMany', 'findUnique', 'count'].includes(params.action)) {
          params.args.where = { ...params.args.where, deletedAt: null };
        }
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args.data = { deletedAt: new Date() };
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}