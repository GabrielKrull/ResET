import { createHash, randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { DatabaseSchema } from "../database/types.js";

const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface AuthenticatedUser {
  sessionId: number;
  userId: number;
  username: string;
  isAdmin: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null;
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createSession(
  db: Kysely<DatabaseSchema>,
  userId: number,
  now = new Date(),
): Promise<{ token: string; absoluteExpiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);
  const idleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);

  await db
    .insertInto("sessions")
    .values({
      user_id: userId,
      token_hash: hashSessionToken(token),
      created_at: now,
      last_activity_at: now,
      idle_expires_at: idleExpiresAt,
      absolute_expires_at: absoluteExpiresAt,
      revoked_at: null,
    })
    .execute();

  return { token, absoluteExpiresAt };
}

export async function authenticateSession(
  db: Kysely<DatabaseSchema>,
  token: string,
  now = new Date(),
): Promise<AuthenticatedUser | null> {
  if (!SESSION_TOKEN_PATTERN.test(token)) return null;

  const tokenHash = hashSessionToken(token);
  const extendedIdleExpiry = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const active = await db
    .updateTable("sessions")
    .set({
      last_activity_at: now,
      idle_expires_at: sql<Date>`LEAST(${extendedIdleExpiry}, absolute_expires_at)`,
    })
    .where("token_hash", "=", tokenHash)
    .where("revoked_at", "is", null)
    .where("idle_expires_at", ">", now)
    .where("absolute_expires_at", ">", now)
    .returning(["id", "user_id"])
    .executeTakeFirst();

  if (!active) {
    await db
      .updateTable("sessions")
      .set({ revoked_at: now })
      .where("token_hash", "=", tokenHash)
      .where("revoked_at", "is", null)
      .where(sql<boolean>`idle_expires_at <= ${now} OR absolute_expires_at <= ${now}`)
      .execute();
    return null;
  }

  const user = await db
    .selectFrom("users")
    .select(["id", "username", "is_admin"])
    .where("id", "=", active.user_id)
    .executeTakeFirst();

  if (!user) return null;
  return {
    sessionId: active.id,
    userId: user.id,
    username: user.username,
    isAdmin: user.is_admin,
  };
}

export async function revokeSession(
  db: Kysely<DatabaseSchema>,
  sessionId: number,
  now = new Date(),
): Promise<void> {
  await db
    .updateTable("sessions")
    .set({ revoked_at: now })
    .where("id", "=", sessionId)
    .where("revoked_at", "is", null)
    .execute();
}

export async function authenticateRequest(
  db: Kysely<DatabaseSchema>,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const header = request.headers.authorization;
  const match = typeof header === "string" ? /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(header) : null;
  const session = match ? await authenticateSession(db, match[1]) : null;

  if (!session) {
    reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Authentication is required." },
    });
    return false;
  }

  request.authUser = session;
  return true;
}
