import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";
import { Attachment } from "nodemailer/lib/mailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly mailHost: string;
  private readonly mailPort: number;
  private readonly mailSecure: boolean;
  private readonly mailFrom: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>("mail.user");
    const pass = this.config.get<string>("mail.pass");
    this.mailHost = this.config.get<string>("mail.host") ?? "localhost";
    this.mailPort = this.config.get<number>("mail.port") ?? 1025;
    this.mailSecure = this.config.get<boolean>("mail.secure") ?? false;
    this.mailFrom =
      this.config.get<string>("mail.from") ??
      "TicketBox <noreply@ticketbox.local>";

    this.transporter = nodemailer.createTransport({
      host: this.mailHost,
      port: this.mailPort,
      secure: this.mailSecure,
      auth: user && pass ? { user, pass } : undefined,
    });

    this.logger.log(
      `Mailer configured host=${this.mailHost} port=${this.mailPort} secure=${this.mailSecure} from=${this.mailFrom} authUser=${user ?? "<none>"}`,
    );
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Attachment[];
  }) {
    this.logger.log(
      `Sending mail to=${options.to} subject=${options.subject} via ${this.mailHost}:${this.mailPort} from=${this.mailFrom}`,
    );

    try {
      const info = await this.transporter.sendMail({
        from: this.mailFrom,
        ...options,
      });

      this.logger.log(
        `Mail sent to ${options.to}: ${info.messageId} accepted=${info.accepted.join(",")} rejected=${info.rejected.join(",")}`,
      );
    } catch (error) {
      const err = error as Error & {
        code?: string;
        response?: string;
        responseCode?: number;
        command?: string;
      };

      this.logger.error(
        `Mail send failed to=${options.to} code=${err.code ?? "UNKNOWN"} responseCode=${err.responseCode ?? "UNKNOWN"} command=${err.command ?? "UNKNOWN"} message=${err.message}`,
      );

      if (err.response) {
        this.logger.error(`SMTP response: ${err.response}`);
      }

      throw error;
    }
  }
}
