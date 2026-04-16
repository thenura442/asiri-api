import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
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

    const patient = await this.prisma.patient.findFirst({
      where: { authUserId: user.id },
    });

    if (!patient) throw new UnauthorizedException('Customer account not found');

    request.user = patient;
    request.userType = 'customer';
    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}