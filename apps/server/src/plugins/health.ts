import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { APP_NAME, APP_VERSION, type HealthStatus } from "@reset/shared";
import type { DatabaseInstance } from "../database/connection.js";

export interface HealthPluginOptions {
  database: DatabaseInstance;
}

export const healthPlugin: FastifyPluginAsync<HealthPluginOptions> = async (
  fastify: FastifyInstance,
  options: HealthPluginOptions,
) => {
  const { database } = options;
  const startTime = Date.now();

  fastify.get("/health/live", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    });
  });

  fastify.get("/health/ready", async (_request, reply) => {
    const isDbConnected = await database.checkHealth();

    const response: HealthStatus = {
      status: isDbConnected ? "ok" : "degraded",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      services: {
        database: isDbConnected ? "connected" : "disconnected",
      },
    };

    if (!isDbConnected) {
      return reply.status(503).send(response);
    }

    return reply.status(200).send(response);
  });

  fastify.get("/api/status", async (_request, reply) => {
    const isDbConnected = await database.checkHealth();

    return reply.status(200).send({
      app: APP_NAME,
      version: APP_VERSION,
      status: isDbConnected ? "healthy" : "degraded",
      database: isDbConnected ? "connected" : "disconnected",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });
};
