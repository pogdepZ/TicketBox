import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

import { UserResponseDto } from '../dto/user-response.dto';
import { authUserInclude } from '../types/auth-user.types';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
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

  async validate(payload: JwtPayload) {
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

    return new UserResponseDto(user);
  }
}
