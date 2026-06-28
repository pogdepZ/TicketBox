import { registerAs } from "@nestjs/config";

export default registerAs("mail", () => ({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.MAIL_FROM ?? "TicketBox <noreply@ticketbox.local>",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3001",
}));
