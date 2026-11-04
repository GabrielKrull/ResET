import { sql, type Kysely, type Transaction } from "kysely";
import { hashPassword, validatePasswordSize } from "./password.js";
import type { DatabaseSchema } from "../database/types.js";

const BOOTSTRAP_LOCK_CLASS = 1_381_197_140; // ASCII "RSET".
const BOOTSTRAP_LOCK_ID = 1;

export type BootstrapErrorCode =
  "invalid-username" | "invalid-password" | "administrator-exists" | "interrupted";

export class BootstrapError extends Error {
  constructor(readonly code: BootstrapErrorCode) {
    super(code);
    this.name = "BootstrapError";
  }
}

export interface InitialAdminCredentials {
  username: string;
  password: string;
}

export interface BootstrapOptions {
  signal?: AbortSignal;
  hashPasswordFn?: (password: string) => Promise<string>;
}

export function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    throw new BootstrapError("invalid-username");
  }
  return normalized;
}

export async function assertBootstrapAvailable(db: Kysely<DatabaseSchema>): Promise<void> {
  const existingAdmin = await db
    .selectFrom("users")
    .select("id")
    .where("is_admin", "=", true)
    .executeTakeFirst();
  if (existingAdmin) throw new BootstrapError("administrator-exists");
}

function throwIfInterrupted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new BootstrapError("interrupted");
}

export async function createFirstAdmin(
  db: Kysely<DatabaseSchema>,
  credentials: InitialAdminCredentials,
  options: BootstrapOptions = {},
): Promise<void> {
  let username: string;
  try {
    username = normalizeUsername(credentials.username);
    validatePasswordSize(credentials.password);
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    throw new BootstrapError("invalid-password");
  }

  const hash = options.hashPasswordFn ?? hashPassword;
  throwIfInterrupted(options.signal);

  await db.transaction().execute(async (transaction: Transaction<DatabaseSchema>) => {
    await sql`select pg_advisory_xact_lock(${BOOTSTRAP_LOCK_CLASS}, ${BOOTSTRAP_LOCK_ID})`.execute(
      transaction,
    );
    throwIfInterrupted(options.signal);

    const existingAdmin = await transaction
      .selectFrom("users")
      .select("id")
      .where("is_admin", "=", true)
      .executeTakeFirst();

    if (existingAdmin) throw new BootstrapError("administrator-exists");
    throwIfInterrupted(options.signal);

    const encodedHash = await hash(credentials.password);
    throwIfInterrupted(options.signal);

    await transaction
      .insertInto("users")
      .values({
        username,
        password_hash: encodedHash,
        is_admin: true,
      })
      .execute();

    throwIfInterrupted(options.signal);
  });
}
