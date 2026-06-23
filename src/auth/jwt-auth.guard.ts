import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Ищем метку @Public на методе или на всем классе
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Публичный роут: пускаем ВСЕГДА, но если пришёл валидный токен —
    // всё равно подгружаем req.user. Это нужно, например, чтобы привязать
    // автора заявки партнёра: эндпоинт публичный (заявку может оставить и
    // гость), но залогиненного пользователя надо связать с заявкой.
    // Раньше при @Public() guard выходил сразу и req.user оставался пустым,
    // из-за чего заявка сохранялась с user: null даже у авторизованных.
    if (isPublic) {
      try {
        await super.canActivate(context);
      } catch {
        // Токена нет или он невалиден — это нормально для публичного роута,
        // продолжаем как аноним.
      }
      return true;
    }

    // 3. Иначе запускаем стандартную проверку JWT (из Passport)
    return (await super.canActivate(context)) as boolean;
  }

  // На публичных роутах не даём passport бросать 401 при отсутствии юзера —
  // возвращаем null, чтобы аноним мог продолжить. На защищённых роутах
  // поведение прежнее (нет юзера → ошибка).
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return user || null;
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
