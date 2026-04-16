import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const request = ctx.switchToHttp().getRequest();
    const { method, url, user, ip } = request;
    const auditMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    return next.handle().pipe(
      tap(async () => {
        if (!auditMethods.includes(method) || !user?.id) return;

        try {
          const action = `${method.toLowerCase()}:${url}`;
          await this.prisma.auditLog.create({
            data: {
              userId: user.id,
              action,
              ipAddress: ip,
              userAgent: request.headers['user-agent'],
            },
          });
        } catch (err) {
          this.logger.warn(`Audit log failed: ${err}`);
        }
      }),
    );
  }
}