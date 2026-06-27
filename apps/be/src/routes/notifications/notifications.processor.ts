import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import { MailService } from "../../common/mail/mail.service";
import { OutboxService } from "../../common/outbox/outbox.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  Prisma,
  TicketStatus,
} from "../../generated/prisma";

type PaymentCompletedPayload = { orderId: string };
type SendSinglePayload = { notificationId: string };
type ReminderPayload = { concertId: string };

@Injectable()
@Processor("notification")
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly outbox: OutboxService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing notification job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case "payment.completed":
        return this.handlePaymentCompleted(job.data as PaymentCompletedPayload);
      case "send-single":
        return this.handleSendSingle(job.data as SendSinglePayload);
      case "concert.reminder":
      case "send-bulk":
        return this.handleConcertReminder(job.data as ReminderPayload);
      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
        return { success: false, skipped: true };
    }
  }

  private async handlePaymentCompleted(payload: PaymentCompletedPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        concert: {
          select: { id: true, name: true, eventDate: true, venueName: true },
        },
        tickets: {
          where: { status: TicketStatus.ACTIVE },
          include: { ticketType: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order || order.status !== OrderStatus.PAID) {
      return { success: false, skipped: true, reason: "Order is not paid" };
    }

    const basePayload = {
      orderId: order.id,
      concertId: order.concertId,
      concertName: order.concert.name,
      eventDate: order.concert.eventDate.toISOString(),
      venueName: order.concert.venueName,
      ticketCodes: order.tickets.map((ticket) => ticket.ticketCode),
      eTicketUrl: this.buildETicketUrl(order.id),
    };

    const inApp = await this.createNotification({
      userId: order.userId,
      concertId: order.concertId,
      channel: NotificationChannel.PUSH,
      template: "payment_completed",
      dedupeKey: this.dedupeKey(
        order.userId,
        order.concertId,
        "payment_completed:in_app",
      ),
      payload: basePayload,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });

    const email = await this.createNotification({
      userId: order.userId,
      concertId: order.concertId,
      channel: NotificationChannel.EMAIL,
      template: "payment_completed_eticket",
      dedupeKey: this.dedupeKey(
        order.userId,
        order.concertId,
        "payment_completed:email",
      ),
      payload: {
        ...basePayload,
        to: order.user.email,
        fullName: order.user.fullName,
        tickets: order.tickets.map((ticket) => ({
          ticketCode: ticket.ticketCode,
          qrPayload: ticket.qrPayload,
          ticketTypeName: ticket.ticketType.name,
          seatNumber: ticket.seatNumber,
        })),
      },
      status: NotificationStatus.PENDING,
    });

    if (email.status === NotificationStatus.PENDING) {
      await this.outbox.put("notification", "send-single", {
        notificationId: email.id,
      });
    }

    return {
      success: true,
      inAppNotificationId: inApp.id,
      emailNotificationId: email.id,
    };
  }

  private async handleConcertReminder(payload: ReminderPayload) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: payload.concertId },
      select: { id: true, name: true, eventDate: true, venueName: true },
    });

    if (!concert)
      return { success: false, skipped: true, reason: "Concert not found" };

    const orders = await this.prisma.order.findMany({
      where: { concertId: concert.id, status: OrderStatus.PAID },
      select: {
        userId: true,
        user: { select: { email: true, fullName: true } },
      },
      distinct: ["userId"],
    });

    let emailsEnqueued = 0;
    for (const order of orders) {
      const reminderPayload = {
        concertId: concert.id,
        concertName: concert.name,
        eventDate: concert.eventDate.toISOString(),
        venueName: concert.venueName,
        to: order.user.email,
        fullName: order.user.fullName,
      };

      await this.createNotification({
        userId: order.userId,
        concertId: concert.id,
        channel: NotificationChannel.PUSH,
        template: "concert_reminder_24h",
        dedupeKey: this.dedupeKey(
          order.userId,
          concert.id,
          "concert_reminder_24h:in_app",
        ),
        payload: reminderPayload,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      const email = await this.createNotification({
        userId: order.userId,
        concertId: concert.id,
        channel: NotificationChannel.EMAIL,
        template: "concert_reminder_24h",
        dedupeKey: this.dedupeKey(
          order.userId,
          concert.id,
          "concert_reminder_24h:email",
        ),
        payload: reminderPayload,
        status: NotificationStatus.PENDING,
      });

      if (email.status === NotificationStatus.PENDING) {
        await this.outbox.put("notification", "send-single", {
          notificationId: email.id,
        });
        emailsEnqueued++;
      }
    }

    return { success: true, users: orders.length, emailsEnqueued };
  }

  private async handleSendSingle(payload: SendSinglePayload) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: payload.notificationId },
      include: { user: { select: { email: true, fullName: true } } },
    });

    if (!notification)
      return {
        success: false,
        skipped: true,
        reason: "Notification not found",
      };
    if (notification.status === NotificationStatus.SENT) {
      return { success: true, notificationId: notification.id, skipped: true };
    }

    try {
      if (notification.channel === NotificationChannel.EMAIL) {
        await this.sendEmail(notification);
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      return { success: true, notificationId: notification.id };
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          retryCount: { increment: 1 },
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  private async sendEmail(notification: any) {
    const payload = (notification.payload ?? {}) as Record<string, any>;
    const to = payload.to ?? notification.user?.email;
    if (!to)
      throw new Error(`Notification ${notification.id} has no email recipient`);

    if (notification.template === "payment_completed_eticket") {
      return this.mail.sendMail({
        to,
        subject: `TicketBox - E-ticket for ${payload.concertName}`,
        html: this.renderPaymentEmail(payload),
        text: `Your payment is successful. E-ticket: ${payload.eTicketUrl}`,
      });
    }

    return this.mail.sendMail({
      to,
      subject: `Reminder: ${payload.concertName} starts within 24 hours`,
      html: this.renderReminderEmail(payload),
      text: `${payload.concertName} starts at ${payload.eventDate}. Venue: ${payload.venueName}`,
    });
  }

  private async createNotification(
    data: Prisma.NotificationUncheckedCreateInput,
  ) {
    try {
      return await this.prisma.notification.create({ data });
    } catch (error) {
      if ((error as any).code === "P2002" && data.dedupeKey) {
        return this.prisma.notification.findUniqueOrThrow({
          where: { dedupeKey: data.dedupeKey },
        });
      }
      throw error;
    }
  }

  private renderPaymentEmail(payload: Record<string, any>): string {
    const tickets = (payload.tickets ?? [])
      .map(
        (ticket: any) =>
          `<li><strong>${ticket.ticketCode}</strong> - ${ticket.ticketTypeName}${ticket.seatNumber ? ` - Seat ${ticket.seatNumber}` : ""}<br/><small>QR payload: ${ticket.qrPayload}</small></li>`,
      )
      .join("");

    return `<h2>Payment successful</h2><p>Hi ${payload.fullName ?? ""}, your tickets for <strong>${payload.concertName}</strong> are ready.</p><ul>${tickets}</ul><p><a href="${payload.eTicketUrl}">Open e-ticket</a></p>`;
  }

  private renderReminderEmail(payload: Record<string, any>): string {
    return `<h2>Your concert starts soon</h2><p>Hi ${payload.fullName ?? ""}, <strong>${payload.concertName}</strong> starts within 24 hours.</p><p>Time: ${payload.eventDate}</p><p>Venue: ${payload.venueName}</p>`;
  }

  private buildETicketUrl(orderId: string): string {
    return `${this.config.get<string>("mail.appBaseUrl")}/tickets/orders/${orderId}`;
  }

  private dedupeKey(
    userId: string,
    concertId: string,
    notificationType: string,
  ): string {
    return `${userId}:${concertId}:${notificationType}`;
  }
}
