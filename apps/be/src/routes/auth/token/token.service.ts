import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
  generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') as any;
    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }
  verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    return this.jwtService.verifyAsync<JwtPayload>(token, { secret });
  }
}
