import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
 
@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    validate,
    load: [databaseConfig, jwtConfig],
  }),
  UserModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}