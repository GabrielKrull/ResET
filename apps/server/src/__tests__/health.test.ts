import { describe, it, expect, vi } from "vitest";
import type { Kysely } from "kysely";
import type pg from "pg";
import { buildApp } from "../app.js";
import type { DatabaseInstance } from "../database/connection.js";
import type { DatabaseSchema } from "../database/types.js";

function createMockDatabase(isHealthy = true): DatabaseInstance {
  return {
    db: {} as Kysely<DatabaseSchema>,
    pool: {} as pg.Pool,
    checkHealth: vi.fn().mockResolvedValue(isHealthy),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("Health Endpoints", () => {
  it("GET /health/live should return 200 with ok status", async () => {
    const mockDb = createMockDatabase(true);
    const app = await buildApp({ database: mockDb, logLevel: "silent" });

    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.status).toBe("ok");
    expect(payload.version).toBeDefined();
    expect(payload.timestamp).toBeDefined();

    await app.close();
  });

  it("GET /health/ready should return 200 when database is healthy", async () => {
    const mockDb = createMockDatabase(true);
    const app = await buildApp({ database: mockDb, logLevel: "silent" });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.status).toBe("ok");
    expect(payload.services.database).toBe("connected");

    await app.close();
  });

  it("GET /health/ready should return 503 when database is disconnected", async () => {
    const mockDb = createMockDatabase(false);
    const app = await buildApp({ database: mockDb, logLevel: "silent" });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    const payload = response.json();
    expect(payload.status).toBe("degraded");
    expect(payload.services.database).toBe("disconnected");

    await app.close();
  });

  it("returns a generic response when an unexpected handler error occurs", async () => {
    const app = await buildApp({ database: createMockDatabase(), logLevel: "silent" });
    app.get("/test/error", async () => {
      throw new Error("database password must not reach the client");
    });

    const response = await app.inject({ method: "GET", url: "/test/error" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
    expect(response.body).not.toContain("database password");
    await app.close();
  });

  it("returns the standard error shape for unknown routes", async () => {
    const app = await buildApp({ database: createMockDatabase(), logLevel: "silent" });

    const response = await app.inject({ method: "GET", url: "/missing" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
    await app.close();
  });
});
