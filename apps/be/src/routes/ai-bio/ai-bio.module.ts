import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AiBioController } from "./ai-bio.controller";
import { AiBioService } from "./ai-bio.service";
import { S3Module } from "../../common/s3/s3.module";
import { OrdersCoreModule } from "../orders/orders-core.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "ai",
    }),
    S3Module,
    OrdersCoreModule,
  ],
  controllers: [AiBioController],
  providers: [AiBioService],
  exports: [AiBioService],
})
export class AiBioModule {}
