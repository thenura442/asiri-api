// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
// import { SupabaseService } from '../../core/supabase/supabase.service';
// import { PrismaService } from '../../core/database/prisma.service';

// @Injectable()
// export class SupabaseAuthGuard implements CanActivate {
//   constructor(
//     private reflector: Reflector,
//     private supabase: SupabaseService,
//     private prisma: PrismaService,
//   ) {}

//   async canActivate(ctx: ExecutionContext): Promise<boolean> {
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
//       ctx.getHandler(),
//       ctx.getClass(),
//     ]);
//     if (isPublic) return true;

//     const request = ctx.switchToHttp().getRequest();
//     const token = this.extractToken(request);
//     if (!token) throw new UnauthorizedException('No token provided');

//     const {
//       data: { user },
//       error,
//     } = await this.supabase.client.auth.getUser(token);

//     if (error || !user) throw new UnauthorizedException('Invalid or expired token');

//     const appUser = await this.prisma.user.findFirst({
//       where: { email: user.email },
//       include: { branch: true },
//     });

//     if (!appUser) throw new UnauthorizedException('User not found');
//     if (appUser.status !== 'active') throw new UnauthorizedException('Account is not active');

//     if (appUser.lockedUntil && appUser.lockedUntil > new Date()) {
//       throw new UnauthorizedException('Account temporarily locked');
//     }

//     request.user = appUser;
//     return true;
//   }

//   private extractToken(request: any): string | null {
//     const [type, token] = request.headers.authorization?.split(' ') ?? [];
//     return type === 'Bearer' ? token : null;
//   }
// }


import {
  Injectable, CanActivate, ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── DEV BYPASS — remove before production ──────────────
    if (this.config.get('NODE_ENV') === 'development') {
      const request = context.switchToHttp().getRequest();
      // Inject a mock super admin user so role guards still work
      request.user = {
        id: 'dev-user-id',
        email: 'superadmin@asiri-labs.lk',
        role: 'super_admin',
        branchId: null,
        status: 'active',
      };
      return true;
    }
    // ───────────────────────────────────────────────────────

    // Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) return false;

    const { data: { user }, error } =
      await this.supabase.client.auth.getUser(token);

    if (error || !user) return false;

    request.user = user;
    return true;
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.split(' ')[1];
  }
}