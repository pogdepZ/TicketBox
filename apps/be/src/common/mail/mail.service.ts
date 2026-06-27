import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>("mail.user");
    const pass = this.config.get<string>("mail.pass");

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("mail.host"),
      port: this.config.get<number>("mail.port"),
      secure: this.config.get<boolean>("mail.secure"),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    const info = await this.transporter.sendMail({
      from: this.config.get<string>("mail.from"),
      ...options,
    });

    this.logger.log(`Mail sent to ${options.to}: ${info.messageId}`);
  }
}
