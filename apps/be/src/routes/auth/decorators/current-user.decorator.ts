import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../../common/types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);