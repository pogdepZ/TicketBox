import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OutboxService } from "../../common/outbox/outbox.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ConcertStatus } from "../../generated/prisma";

@Injectable()
export class ConcertReminderJob {
  private readonly logger = new Logger(ConcertReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async enqueueUpcomingConcertReminders(): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const concerts = await this.prisma.concert.findMany({
      where: {
        status: ConcertStatus.PUBLISHED,
        eventDate: {
          gt: now,
          lte: in24Hours,
        },
        orders: { some: { status: "PAID" } },
      },
      select: { id: true },
      orderBy: { eventDate: "asc" },
    });

    for (const concert of concerts) {
      await this.outbox.put("notification", "concert.reminder", {
        concertId: concert.id,
      });
    }

    if (concerts.length > 0) {
      this.logger.log(`Queued 24h reminders for ${concerts.length} concerts`);
    }
  }
}
