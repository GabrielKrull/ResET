import dotenv from "dotenv";
import { serverEnvSchema, type ServerEnv } from "@reset/shared";

dotenv.config();

export function loadConfig(envOverride?: Record<string, string | undefined>): ServerEnv {
  const source = envOverride ?? process.env;
  const parsed = serverEnvSchema.safeParse(source);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server configuration:\n${errorDetails}`);
  }

  return parsed.data;
}
