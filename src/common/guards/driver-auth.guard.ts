import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class DriverAuthGuard implements CanActivate {
  constructor(
    private supabase: SupabaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    const {
      data: { user },
      error,
    } = await this.supabase.client.auth.getUser(token);

    if (error || !user) throw new UnauthorizedException('Invalid or expired token');

    const driver = await this.prisma.driver.findFirst({
      where: { email: user.email },
      include: { branch: true },
    });

    if (!driver) throw new UnauthorizedException('Driver account not found');
    if (driver.status !== 'active') throw new UnauthorizedException('Driver account is not active');

    request.user = driver;
    request.userType = 'driver';
    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}