import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator'; // 👈 ВАЖНО: импортируем ключ публичности
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. ПРОВЕРКА НА ПУБЛИЧНОСТЬ:
    // Если роут @Public(), сразу пускаем, роли проверять не нужно вообще
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Читаем, какие роли нужны
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    // 3. Достаем юзера из запроса
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. ЗАЩИТА ОТ КРАША: Если юзера нет, возвращаем false (NestJS выдаст 403 Forbidden)
    if (!user) {
      return false;
    }

    // 5. Проверяем: есть ли у юзера хотя бы одна из требуемых ролей?
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
