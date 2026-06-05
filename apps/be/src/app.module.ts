import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { AuthModule } from './routes/auth/auth.module';
import { ConcertModule } from './routes/concert/concert.module';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
 
@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    validate,
    load: [databaseConfig, jwtConfig],
  }),
  PrismaModule, AuthModule, ConcertModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}