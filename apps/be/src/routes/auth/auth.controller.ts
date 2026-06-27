import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { CookieOptions, Request, Response } from "express";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthUser } from "./dto/user-response.dto";

const CHECKIN_MOBILE_CLIENT = "checkin-mobile";
const REFRESH_TOKEN_COOKIE = "refreshToken";

type RefreshBody = {
  refreshToken?: unknown;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      ...(this.shouldExposeRefreshToken(req)
        ? { refreshToken: result.refreshToken }
        : {}),
    };
  }

  @Post("refresh")
  async refresh(
    @Body() body: RefreshBody | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      this.getCookie(req, REFRESH_TOKEN_COOKIE) ??
      this.getMobileRefreshToken(req, body);

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is missing");
    }

    const result = await this.authService.refresh(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      ...(this.shouldExposeRefreshToken(req)
        ? { refreshToken: result.refreshToken }
        : {}),
    };
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearRefreshTokenCookie(res);

    return {
      message: "Logged out successfully",
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.getRefreshTokenCookieOptions(),
    );
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      ...this.getRefreshTokenBaseCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private getRefreshTokenBaseCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    };
  }

  private clearRefreshTokenCookie(res: Response) {
    const options = this.getRefreshTokenBaseCookieOptions();

    res.clearCookie(REFRESH_TOKEN_COOKIE, options);

    for (const path of ["/auth/refresh", "/api/auth/refresh", "/"]) {
      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        ...options,
        path,
      });
    }
  }

  private getCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
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

  private getMobileRefreshToken(
    req: Request,
    body: RefreshBody | undefined,
  ): string | undefined {
    if (!this.shouldExposeRefreshToken(req)) {
      return undefined;
    }

    const headerToken = this.getHeader(req, "x-refresh-token");
    if (headerToken) {
      return headerToken;
    }

    if (typeof body?.refreshToken === "string" && body.refreshToken.trim()) {
      return body.refreshToken;
    }

    return undefined;
  }

  private shouldExposeRefreshToken(req: Request): boolean {
    return this.getHeader(req, "x-ticketbox-client") === CHECKIN_MOBILE_CLIENT;
  }

  private getHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
