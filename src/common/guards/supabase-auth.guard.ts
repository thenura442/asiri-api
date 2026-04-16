import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    const {
      data: { user },
      error,
    } = await this.supabase.client.auth.getUser(token);

    if (error || !user) throw new UnauthorizedException('Invalid or expired token');

    const appUser = await this.prisma.user.findFirst({
      where: { email: user.email },
      include: { branch: true },
    });

    if (!appUser) throw new UnauthorizedException('User not found');
    if (appUser.status !== 'active') throw new UnauthorizedException('Account is not active');

    if (appUser.lockedUntil && appUser.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    request.user = appUser;
    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}