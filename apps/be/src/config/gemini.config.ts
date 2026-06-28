import { registerAs } from "@nestjs/config";

export default registerAs("gemini", () => ({
  apiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "2048", 10),
  timeoutMs: 60000,
}));
