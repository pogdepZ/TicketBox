import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

import { AuthUser, UserResponseDto } from '../dto/user-response.dto';
import { authUserInclude } from '../types/auth-user.types';
import { JwtPayload } from '../types/jwt-payload.type';
import { AuthCacheService } from '../auth-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly authCacheService: AuthCacheService,
  ) {
    const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: accessSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const cachedUser = await this.authCacheService.getUser(payload.sub);

    if (cachedUser) {
      if (cachedUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('User is not active');
      }

      return cachedUser;
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: authUserInclude,
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    const authUser = new UserResponseDto(user);
    await this.authCacheService.setUser(authUser);

    return authUser;
  }
}
