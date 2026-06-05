import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CookieOptions, Request, Response } from 'express';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './dto/user-response.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res({passthrough: true }) res: Response) {
    const result = await this.authService.login(body);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.getCookie(req, 'refreshToken');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      path: '/auth/refresh',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      message: 'Logged out successfully',
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, this.getRefreshTokenCookieOptions());
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    };
  }

  private getCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));

    if (!cookie) {
      return undefined;
    }

    try {
      return decodeURIComponent(cookie.slice(name.length + 1));
    } catch {
      return undefined;
    }
  }
}
