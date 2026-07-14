import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sgMail from "@sendgrid/mail";

export type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailFrom: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>("mail.sendGridApiKey");
    this.mailFrom =
      this.config.get<string>("mail.from") ??
      "TicketBox <noreply@ticketbox.local>";

    sgMail.setApiKey(apiKey);

    this.logger.log(`SendGrid mailer configured from=${this.mailFrom}`);
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: MailAttachment[];
  }) {
    this.logger.log(
      `Sending mail to=${options.to} subject=${options.subject} via SendGrid from=${this.mailFrom}`,
    );

    try {
      const [response] = await sgMail.send({
        from: this.mailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.isBuffer(attachment.content)
            ? attachment.content.toString("base64")
            : attachment.content,
          type: attachment.contentType,
          disposition: attachment.cid ? "inline" : "attachment",
          content_id: attachment.cid,
        })),
      });

      this.logger.log(
        `Mail sent to=${options.to} statusCode=${response.statusCode} messageId=${response.headers["x-message-id"] ?? "UNKNOWN"}`,
      );
    } catch (error) {
      const err = error as Error & {
        code?: string;
        response?: { statusCode?: number; body?: unknown };
      };

      this.logger.error(
        `SendGrid mail failed to=${options.to} code=${err.code ?? "UNKNOWN"} statusCode=${err.response?.statusCode ?? "UNKNOWN"} message=${err.message}`,
      );

      if (err.response?.body) {
        this.logger.error(`SendGrid response: ${JSON.stringify(err.response.body)}`);
      }

      throw error;
    }
  }
}
