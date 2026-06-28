import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import { Attachment } from "nodemailer/lib/mailer";
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
type QrRenderOptions = {
  type?: "png";
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
  width?: number;
};

const QRCode = require("qrcode") as {
  toBuffer(text: string, options?: QrRenderOptions): Promise<Buffer>;
};

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
    this.logger.log(
      `Starting payment.completed fan-out for orderId=${payload.orderId}`,
    );

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
      this.logger.warn(
        `Skipping payment.completed for orderId=${payload.orderId} because order is missing or not PAID`,
      );
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
      totalAmount: order.totalAmount.toString(),
      paymentMethod: order.paymentMethod ? String(order.paymentMethod) : "N/A",
      paymentRef: order.paymentRef || "N/A",
      paidAt: order.paidAt ? order.paidAt.toISOString() : new Date().toISOString(),
    };

    const inApp = await this.createNotification({
      userId: order.userId,
      concertId: order.concertId,
      channel: NotificationChannel.PUSH,
      template: "payment_completed",
      dedupeKey: this.dedupeKey(
        order.userId,
        order.id,
        "payment_completed:in_app",
      ),
      payload: basePayload,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });

    await this.prisma.inAppNotification.create({
      data: {
        userId: order.userId,
        title: "Thanh toán đơn hàng thành công",
        message: `Thanh toán thành công đơn hàng vé concert "${order.concert.name}". Mã vé QR của bạn đã sẵn sàng!`,
        read: false,
      },
    });

    const email = await this.createNotification({
      userId: order.userId,
      concertId: order.concertId,
      channel: NotificationChannel.EMAIL,
      template: "payment_completed_eticket",
      dedupeKey: this.dedupeKey(
        order.userId,
        order.id,
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

    this.logger.log(
      `payment.completed created/resolved email notificationId=${email.id} status=${email.status} dedupeKey=${this.dedupeKey(
        order.userId,
        order.id,
        "payment_completed:email",
      )}`,
    );

    if (email.status === NotificationStatus.PENDING) {
      this.logger.log(
        `Enqueueing send-single for notificationId=${email.id} orderId=${order.id}`,
      );
      await this.outbox.put("notification", "send-single", {
        notificationId: email.id,
      });
    } else {
      this.logger.warn(
        `Skipping send-single enqueue for notificationId=${email.id} because status=${email.status}`,
      );
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

      const inAppDedupeKey = this.dedupeKey(
        order.userId,
        concert.id,
        "concert_reminder_24h:in_app",
      );

      const existingInApp = await this.prisma.notification.findUnique({
        where: { dedupeKey: inAppDedupeKey },
      });

      if (!existingInApp) {
        await this.createNotification({
          userId: order.userId,
          concertId: concert.id,
          channel: NotificationChannel.PUSH,
          template: "concert_reminder_24h",
          dedupeKey: inAppDedupeKey,
          payload: reminderPayload,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        });

        await this.prisma.inAppNotification.create({
          data: {
            userId: order.userId,
            title: "Sự kiện sắp diễn ra",
            message: `Chỉ còn chưa đầy 24 giờ nữa là concert "${concert.name}" sẽ bắt đầu. Đừng bỏ lỡ nhé!`,
            read: false,
          },
        });
      }

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
    this.logger.log(
      `Starting send-single for notificationId=${payload.notificationId}`,
    );

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
      this.logger.warn(
        `Skipping send-single for notificationId=${notification.id} because it is already SENT`,
      );
      return { success: true, notificationId: notification.id, skipped: true };
    }

    try {
      if (notification.channel === NotificationChannel.EMAIL) {
        this.logger.log(
          `Sending EMAIL notificationId=${notification.id} template=${notification.template}`,
        );
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
      this.logger.log(
        `Notification ${notification.id} marked as SENT after successful processing`,
      );
      return { success: true, notificationId: notification.id };
    } catch (error) {
      this.logger.error(
        `Failed processing notificationId=${notification.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
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

    this.logger.log(
      `Preparing email notificationId=${notification.id} template=${notification.template} to=${to}`,
    );

    if (notification.template === "payment_completed_eticket") {
      const { html, attachments } = await this.renderPaymentEmail(payload);

      return this.mail.sendMail({
        to,
        subject: `TicketBox - E-ticket for ${payload.concertName}`,
        html,
        text: `Your payment is successful. E-ticket: ${payload.eTicketUrl}`,
        attachments,
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

  private async renderPaymentEmail(
    payload: Record<string, any>,
  ): Promise<{
    html: string;
    attachments: Attachment[];
  }> {
    const attachments: Attachment[] = [];

    const tickets = await Promise.all(
      (payload.tickets ?? []).map(async (ticket: any, index: number) => {
        const cid = `ticket-qr-${index}-${ticket.ticketCode}@ticketbox`;

        const qrBuffer = ticket.qrPayload
          ? await this.generateQrBuffer(ticket.qrPayload)
          : null;

        if (qrBuffer) {
          attachments.push({
            filename: `${ticket.ticketCode}.png`,
            content: qrBuffer,
            cid,
            contentType: "image/png",
          });
        }

        return `
          <div style="background-color: #fafbfc; border: 1px solid #d0d7de; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 5px solid #e5484d;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td style="vertical-align: top; padding-right: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  <span style="display: inline-block; background-color: #eaf0ee; color: #123c3a; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em; margin-bottom: 12px;">
                    ${ticket.ticketTypeName}
                  </span>
                  <h3 style="font-size: 18px; font-weight: 800; color: #1f2328; margin: 0 0 6px 0; font-family: monospace; letter-spacing: 0.02em;">
                    ${ticket.ticketCode}
                  </h3>
                  ${
                    ticket.seatNumber
                      ? `<p style="font-size: 13px; color: #57606a; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Ghế: <strong style="color: #24292f;">${ticket.seatNumber}</strong></p>`
                      : `<p style="font-size: 13px; color: #57606a; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Vé phổ thông tự do</p>`
                  }
                </td>
                <td align="right" style="vertical-align: middle; width: 140px;">
                  ${
                    qrBuffer
                      ? `
                        <div style="border: 1px solid #e1e4e6; padding: 6px; border-radius: 8px; background-color: #ffffff; display: inline-block; width: 120px; text-align: center;">
                          <img
                            src="cid:${cid}"
                            alt="QR for ticket ${ticket.ticketCode}"
                            width="120"
                            height="120"
                            style="display:block; width: 120px; height: 120px; border: none;"
                          />
                        </div>
                      `
                      : `
                        <div style="border: 2px dashed #d0d7de; padding: 12px 6px; border-radius: 8px; text-align: center; color: #8c959f; font-size: 10px; font-weight: 700; line-height: 1.2; width: 120px; font-family: monospace;">
                          Mã vé:<br/>
                          <small style="font-size: 8px; word-break: break-all;">${ticket.qrPayload}</small>
                        </div>
                      `
                  }
                </td>
              </tr>
            </table>
          </div>
        `;
      }),
    );

    let eventDateFormatted = payload.eventDate;
    try {
      const d = new Date(payload.eventDate);
      eventDateFormatted = `${d.toLocaleDateString("vi-VN")} lúc ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } catch (e) {}

    let paidDateFormatted = payload.paidAt || "";
    try {
      const d = new Date(payload.paidAt);
      paidDateFormatted = `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } catch (e) {}

    let formattedAmount = "0";
    try {
      if (payload.totalAmount) {
        const amt = parseFloat(payload.totalAmount);
        formattedAmount = amt.toLocaleString("vi-VN");
      }
    } catch (e) {}

    const html = `
      <div style="background-color: #f6f8fa; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #24292f; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #d0d7de; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background-color: #e5484d; padding: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.05em;">TICKETBOX</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h2 style="font-size: 22px; font-weight: 800; color: #1f2328; margin: 0 0 12px 0; line-height: 1.3;">Thanh toán thành công! 🎉</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #57606a; margin: 0 0 24px 0;">
                Chào <strong>${payload.fullName || "bạn"}</strong>,<br>
                Đơn đặt vé của bạn cho sự kiện <strong>${payload.concertName}</strong> đã được thanh toán thành công. Dưới đây là biên lai thanh toán và vé điện tử của bạn:
              </p>

              <!-- Payment Details Card -->
              <div style="background-color: #fafbfc; border: 1px solid #d0d7de; border-radius: 12px; padding: 20px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h3 style="font-size: 14px; font-weight: 800; color: #1f2328; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e1e4e6; padding-bottom: 8px;">Thông tin thanh toán</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #24292f; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #57606a; font-weight: 500;">Mã đơn hàng:</td>
                    <td align="right" style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #24292f;">${payload.orderId ? payload.orderId.substring(0, 8).toUpperCase() : "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #57606a; font-weight: 500;">Mã giao dịch:</td>
                    <td align="right" style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #24292f;">${payload.paymentRef || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #57606a; font-weight: 500;">Phương thức:</td>
                    <td align="right" style="padding: 6px 0; font-weight: 700; color: #24292f; text-transform: uppercase;">${payload.paymentMethod || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #57606a; font-weight: 500;">Thời gian:</td>
                    <td align="right" style="padding: 6px 0; font-weight: 700; color: #24292f;">${paidDateFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0 0; color: #1f2328; font-weight: 800; border-top: 1px dashed #d0d7de; font-size: 16px;">Tổng cộng:</td>
                    <td align="right" style="padding: 12px 0 0 0; font-weight: 900; color: #e5484d; border-top: 1px dashed #d0d7de; font-size: 18px;">${formattedAmount} VND</td>
                  </tr>
                </table>
              </div>

              <!-- Ticket details / cards -->
              <h3 style="font-size: 14px; font-weight: 800; color: #1f2328; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Thông tin vé vào cổng</h3>
              <div style="margin-bottom: 24px;">
                ${tickets.join("")}
              </div>

              <!-- Event Details -->
              <div style="background-color: #f6f8fa; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px dashed #d0d7de; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h3 style="font-size: 14px; font-weight: 800; color: #e5484d; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Chi tiết sự kiện</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #24292f; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 100px; color: #57606a; vertical-align: top;">Thời gian:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${eventDateFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #57606a; vertical-align: top;">Địa điểm:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${payload.venueName}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${payload.eTicketUrl}" style="background-color: #e5484d; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 9999px; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(229, 72, 77, 0.25); text-align: center;">
                  Mở Vé Điện Tử (E-Ticket)
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f6f8fa; padding: 24px; text-align: center; font-size: 12px; color: #57606a; border-top: 1px solid #d0d7de; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 8px 0; font-weight: 600;">© 2026 TicketBox. All rights reserved.</p>
              <p style="margin: 0; line-height: 1.4;">Email này được gửi tự động từ hệ thống TicketBox. Vui lòng không trả lời trực tiếp.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    return {
      html,
      attachments,
    };
  }

  private async generateQrBuffer(
    qrPayload: string,
  ): Promise<Buffer | null> {
    try {
      return await QRCode.toBuffer(qrPayload, {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 1,
        width: 180,
      });
    } catch (error) {
      this.logger.warn(
        `Failed generating QR image for email payload: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      return null;
    }
  }

  private renderReminderEmail(payload: Record<string, any>): string {
    let eventDateFormatted = payload.eventDate;
    try {
      const d = new Date(payload.eventDate);
      eventDateFormatted = `${d.toLocaleDateString("vi-VN")} lúc ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } catch (e) {}

    const appBaseUrl = this.config.get<string>("mail.appBaseUrl", "http://localhost:3000");
    const myTicketsUrl = `${appBaseUrl}/my-tickets`;

    return `
      <div style="background-color: #f6f8fa; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #24292f; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #d0d7de; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background-color: #e5484d; padding: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.05em;">TICKETBOX</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h2 style="font-size: 22px; font-weight: 800; color: #1f2328; margin: 0 0 12px 0; line-height: 1.3;">Sắp đến giờ diễn ra sự kiện! 🎤</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #57606a; margin: 0 0 24px 0;">
                Chào <strong>${payload.fullName || "bạn"}</strong>,<br>
                Chỉ còn chưa đầy 24 giờ nữa là sự kiện <strong>${payload.concertName}</strong> sẽ chính thức bắt đầu. Hãy chuẩn bị sẵn sàng để tận hưởng đêm nhạc tuyệt vời này!
              </p>

              <!-- Event Details Card -->
              <div style="background-color: #fafbfc; border: 1px solid #d0d7de; border-radius: 12px; padding: 20px; margin-bottom: 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h3 style="font-size: 14px; font-weight: 800; color: #e5484d; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Thông tin chi tiết</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #24292f; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 100px; color: #57606a; vertical-align: top;">Thời gian:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${eventDateFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #57606a; vertical-align: top;">Địa điểm:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${payload.venueName}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${myTicketsUrl}" style="background-color: #e5484d; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 9999px; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(229, 72, 77, 0.25); text-align: center;">
                  Kiểm tra vé của tôi
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f6f8fa; padding: 24px; text-align: center; font-size: 12px; color: #57606a; border-top: 1px solid #d0d7de; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 8px 0; font-weight: 600;">© 2026 TicketBox. All rights reserved.</p>
              <p style="margin: 0; line-height: 1.4;">Email này được gửi tự động từ hệ thống TicketBox. Vui lòng không trả lời trực tiếp.</p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  private buildETicketUrl(orderId: string): string {
    return `${this.config.get<string>("mail.appBaseUrl")}/tickets/orders/${orderId}`;
  }

  private dedupeKey(
    userId: string,
    orderId: string,
    notificationType: string,
  ): string {
    return `${userId}:${orderId}:${notificationType}`;
  }
}
