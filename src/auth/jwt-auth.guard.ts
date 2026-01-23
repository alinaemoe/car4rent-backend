import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1. Ищем метку @Public на методе или на всем классе
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Если метка есть — пускаем без проверки токена
    if (isPublic) {
      return true;
    }

    // 3. Иначе запускаем стандартную проверку JWT (из Passport)
    return super.canActivate(context);
  }
}
