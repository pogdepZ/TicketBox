import { registerAs } from "@nestjs/config";

export default registerAs("mail", () => ({
  sendGridApiKey: process.env.SENDGRID_API_KEY,
  from: process.env.MAIL_FROM ?? "TicketBox <noreply@ticketbox.local>",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
}));
