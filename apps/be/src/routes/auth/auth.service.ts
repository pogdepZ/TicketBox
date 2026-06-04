import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { HashService } from '../../common/crypto/hash.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token/token.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/types/jwt-payload.type';


@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}
  async register(registerDto: RegisterDto) {
    const { password, ...userData } = registerDto;
    const passwordHash = await this.hashService.hashPassword(password);
    try {
      return await this.prismaService.user.create({
        data: {
          ...userData,
          password: passwordHash,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          status: true,
        }, 
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
  async login(body: LoginDto) {
    const { email, password } = body;
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user || password === undefined || user.password === null) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await this.hashService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = await this.generateTokens(payload);
    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
      },
      ...token,
    };
  }
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    const tokenPayload: JwtPayload = { sub: user.id, email: user.email };
    const token = await this.generateTokens(tokenPayload);

    return {
      user,
      ...token,
    };
  }
  generateTokens(payload: JwtPayload) {
    return Promise.all([
      this.tokenService.generateAccessToken(payload),
      this.tokenService.generateRefreshToken(payload),
    ]).then(([accessToken, refreshToken]) => ({
      accessToken,
      refreshToken,
    }));
  }
}
