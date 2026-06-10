import { Module } from '@nestjs/common';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { AuthCacheService } from './auth-cache.service';
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        const expiresIn =
          configService.get<string>('JWT_ACCESS_EXPIRES_IN') as any;

        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not defined');
        }
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      }
    }),

    PassportModule.register({ defaultStrategy: 'jwt' }),
  
    CryptoModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCacheService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, TokenService, JwtStrategy, AuthCacheService]
})
export class AuthModule { }
