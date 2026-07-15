import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AiBioProcessor } from "./routes/ai-bio/ai-bio.processor";
import { GuestListProcessor } from "./routes/guest-list/guest-list.processor";
import { GuestListImportJob } from "./routes/guest-list/guest-list-import.job";
import { GuestListModule } from "./routes/guest-list/guest-list.module";
import { ConcertReminderJob } from "./routes/notifications/concert-reminder.job";
import { NotificationsProcessor } from "./routes/notifications/notifications.processor";
import { OrderExpirationJob } from "./routes/orders/order-expiration.job";
import { OrdersCoreModule } from "./routes/orders/orders-core.module";
import { SharedModule } from "./shared.module";
import { S3Module } from "./common/s3/s3.module";

@Module({
  imports: [
    SharedModule,
    S3Module,
    ScheduleModule.forRoot(),
    OrdersCoreModule,
    GuestListModule,
    BullModule.registerQueue(
      { name: "notification" },
      { name: "ai" },
      { name: "csv" },
    ),
  ],
  providers: [
    OrderExpirationJob,
    ConcertReminderJob,
    NotificationsProcessor,
    AiBioProcessor,
    GuestListProcessor,
    GuestListImportJob,
  ],
})
export class WorkerModule {}
