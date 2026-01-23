import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Читаем, какие роли нужны для метода (или класса)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Если роли не заданы (метод доступен всем залогиненным) — пускаем
    if (!requiredRoles) {
      return true;
    }

    // 3. Достаем юзера из запроса (туда его положил JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // 4. Проверяем: есть ли у юзера хотя бы одна из требуемых ролей?
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
