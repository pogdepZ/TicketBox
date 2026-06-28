import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigType } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { OutboxModule } from "./common/outbox/outbox.module";
import { MailModule } from "./common/mail/mail.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import databaseConfig from "./config/database.config";
import { validate } from "./config/env.validation";
import geminiConfig from "./config/gemini.config";
import jwtConfig from "./config/jwt.config";
import mailConfig from "./config/mail.config";
import redisConfig from "./config/redis.config";
import s3Config from "./config/s3.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [
        databaseConfig,
        jwtConfig,
        redisConfig,
        s3Config,
        geminiConfig,
        mailConfig,
      ],
    }),
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          db: redis.db,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    OutboxModule,
  ],
  exports: [ConfigModule, PrismaModule, RedisModule, MailModule, OutboxModule],
})
export class SharedModule {}
