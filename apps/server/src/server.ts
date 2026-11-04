import { loadConfig } from "./config.js";
import { createDatabase } from "./database/connection.js";
import { buildApp } from "./app.js";

async function bootstrap() {
  const config = loadConfig();

  console.log(`[ResET Server] Starting in ${config.NODE_ENV} mode...`);

  // Initialize Database
  const database = createDatabase(config.DATABASE_URL);

  // Build Fastify App
  const app = await buildApp({
    database,
    logLevel: config.LOG_LEVEL,
  });

  // Graceful Shutdown
  let shutdownPromise: Promise<void> | undefined;
  async function gracefulShutdown(signal: string, exitCode = 0): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    const shutdownDeadline = setTimeout(() => {
      console.error("[ResET Server] Shutdown deadline exceeded; forcing process exit.");
      process.exit(1);
    }, 10_000);
    shutdownPromise = (async () => {
      console.log(`[ResET Server] Received ${signal}. Starting graceful shutdown...`);

      try {
        await app.close();
        console.log("[ResET Server] HTTP server closed.");
        await database.close();
        console.log("[ResET Server] Database connections closed.");
      } catch (err) {
        console.error("[ResET Server] Error during shutdown:", err);
        exitCode = 1;
      }
      clearTimeout(shutdownDeadline);
      process.exitCode = exitCode;
    })();
    return shutdownPromise;
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("uncaughtException", (error) => {
    console.error("[ResET Server] Uncaught exception; shutting down.", error);
    void gracefulShutdown("uncaughtException", 1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[ResET Server] Unhandled rejection; shutting down.", reason);
    void gracefulShutdown("unhandledRejection", 1);
  });

  // Start HTTP Listener
  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`[ResET Server] Listening on http://${config.HOST}:${config.PORT}`);
    console.log(`[ResET Server] Health liveness: http://${config.HOST}:${config.PORT}/health/live`);
    console.log(
      `[ResET Server] Health readiness: http://${config.HOST}:${config.PORT}/health/ready`,
    );
  } catch (err) {
    console.error("[ResET Server] Failed to bind to port:", err);
    await database.close();
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("[ResET Server] Fatal bootstrap error:", err);
  process.exit(1);
});
