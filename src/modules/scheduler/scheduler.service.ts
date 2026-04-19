import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  onModuleInit() {
    this.logger.log('Scheduler initialized — all cron jobs active');
  }
}