import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { HashService } from '../../common/crypto/hash.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token/token.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { authUserInclude } from './types/auth-user.types';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthCacheService } from './auth-cache.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
    private readonly authCacheService: AuthCacheService,
  ) {}
  async register(registerDto: RegisterDto) {
    const { password, ...userData } = registerDto;
    const customerRole = await this.prismaService.role.findUnique({
      where: { name: 'customer' },
    });

    if (!customerRole) {
      throw new InternalServerErrorException(
        'Default customer role is not seeded',
      );
    }

    const passwordHash = await this.hashService.hashPassword(password);
    try {
      const user = await this.prismaService.user.create({
        data: {
          ...userData,
          password: passwordHash,
          roles: {
            create: {
              roleId: customerRole.id,
            },
          },
        },
        include: authUserInclude,
        omit: {
          password: true,
        },
      });
      await this.authCacheService.invalidateUser(user.id);
      
      // Tạo thông báo chào mừng in-app
      await this.prismaService.inAppNotification.create({
        data: {
          userId: user.id,
          title: "Chào mừng bạn đến với TicketBox",
          message: "Đăng ký tài khoản thành công! Khám phá các concert và săn vé ngay nhé.",
          read: false,
        },
      });

      return new UserResponseDto(user);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
  async login(body: LoginDto) {
    const { email, password } = body;
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: authUserInclude,
    });
    if (!user || password === undefined || user.password === null) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { password: userPassword, ...authUser } = user;
        const isPasswordValid = await this.hashService.comparePassword(password, userPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (authUser.status === 'BLOCKED') {
      throw new UnauthorizedException('User is blocked');
    }
    if (authUser.status === 'DELETED') {
      throw new UnauthorizedException('User is deleted');
    }
    if (authUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }
    const payload: JwtPayload = { sub: authUser.id, email: authUser.email };
    const token = await this.generateTokens(payload);
    await this.authCacheService.setUser(new UserResponseDto(authUser));

    return {
      user: new UserResponseDto(authUser),
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
      include: authUserInclude,
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('User is blocked');
    }
    if (user.status === 'DELETED') {
      throw new UnauthorizedException('User is deleted');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    const tokenPayload: JwtPayload = { sub: user.id, email: user.email };
    const token = await this.generateTokens(tokenPayload);
    await this.authCacheService.setUser(new UserResponseDto(user));

    return {
      user: new UserResponseDto(user),
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
