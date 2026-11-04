import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { healthPlugin } from "./plugins/health.js";
import type { DatabaseInstance } from "./database/connection.js";

export interface BuildAppOptions {
  database: DatabaseInstance;
  logLevel?: string;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { database, logLevel = "info" } = options;

  const fastify = Fastify({
    logger: {
      level: logLevel,
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
          };
        },
      },
    },
  });

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 500;

    request.log.error({ err: error }, "Request failed");
    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
        message:
          statusCode === 500
            ? "An unexpected error occurred."
            : "The request could not be processed.",
      },
    });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  // Register health check endpoints
  await fastify.register(healthPlugin, { database });

  return fastify;
}
