import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { DatabaseInstance } from "../database/connection.js";
import { verifyAndRehashPassword, hashPassword } from "./password.js";
import { authenticateRequest, createSession, revokeSession } from "./session.js";

interface AuthPluginOptions {
  database: DatabaseInstance;
}

const loginSchema = z
  .object({
    username: z.string().max(64),
    password: z.string().max(1024),
  })
  .strict();

const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString("base64url"));
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_KEYS = 10_000;
const failedAttempts = new Map<string, { count: number; expiresAt: number }>();

function rateKeys(ip: string, username: string): [string, number][] {
  return [
    [`ip:${ip}`, 25],
    [`identity:${ip}:${username}`, 5],
  ];
}

function isRateLimited(keys: [string, number][], now: number): boolean {
  for (const [key] of keys) {
    const entry = failedAttempts.get(key);
    if (entry && entry.expiresAt <= now) failedAttempts.delete(key);
  }
  return keys.some(([key, limit]) => (failedAttempts.get(key)?.count ?? 0) >= limit);
}

function recordFailure(keys: [string, number][], now: number): void {
  for (const [key] of keys) {
    const entry = failedAttempts.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (failedAttempts.size >= MAX_RATE_KEYS) {
        const oldestKey = failedAttempts.keys().next().value;
        if (oldestKey !== undefined) failedAttempts.delete(oldestKey);
      }
      failedAttempts.set(key, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    } else {
      entry.count += 1;
    }
  }
}

function clearIdentityFailure(identityKey: string): void {
  failedAttempts.delete(identityKey);
}

export const authRoutes: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const db = options.database.db;

  fastify.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "The request could not be processed." },
      });
    }

    const username = parsed.data.username.trim().toLowerCase();
    const normalizedUsername = /^[a-z0-9._-]{3,32}$/.test(username) ? username : null;
    const rateUsername = normalizedUsername ?? "<invalid>";
    const keys = rateKeys(request.ip, rateUsername);
    const now = Date.now();
    if (isRateLimited(keys, now)) {
      return reply.status(429).send({
        error: { code: "LOGIN_RATE_LIMITED", message: "The request could not be processed." },
      });
    }

    const user =
      normalizedUsername === null
        ? undefined
        : await db
            .selectFrom("users")
            .select(["id", "username", "password_hash", "is_admin"])
            .where("username", "=", normalizedUsername)
            .executeTakeFirst();

    const passwordHash = user?.password_hash ?? (await DUMMY_PASSWORD_HASH);
    const verification = await verifyAndRehashPassword(parsed.data.password, passwordHash);
    if (!user || !verification.valid) {
      recordFailure(keys, now);
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "The username or password is incorrect." },
      });
    }

    if (verification.replacementHash) {
      await db
        .updateTable("users")
        .set({ password_hash: verification.replacementHash })
        .where("id", "=", user.id)
        .execute();
    }

    clearIdentityFailure(`identity:${request.ip}:${normalizedUsername}`);
    const session = await createSession(db, user.id);
    return reply.send({
      token: session.token,
      expiresAt: session.absoluteExpiresAt.toISOString(),
      user: { id: user.id, username: user.username, isAdmin: user.is_admin },
    });
  });

  fastify.get("/auth/me", async (request, reply) => {
    if (!(await authenticateRequest(db, request, reply))) return;
    const user = request.authUser!;
    return reply.send({
      user: { id: user.userId, username: user.username, isAdmin: user.isAdmin },
    });
  });

  fastify.post("/auth/logout", async (request, reply) => {
    if (!(await authenticateRequest(db, request, reply))) return;
    await revokeSession(db, request.authUser!.sessionId);
    return reply.status(204).send();
  });
};
