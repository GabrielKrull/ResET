import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { DatabaseSchema } from "./types.js";

const { Pool } = pg;

export interface DatabaseInstance {
  db: Kysely<DatabaseSchema>;
  pool: pg.Pool;
  checkHealth: () => Promise<boolean>;
  close: () => Promise<void>;
}

export interface DatabasePoolOptions {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function createDatabase(
  connectionString: string,
  options?: DatabasePoolOptions,
): DatabaseInstance {
  const pool = new Pool({
    connectionString,
    max: options?.max ?? 10,
    idleTimeoutMillis: options?.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: options?.connectionTimeoutMillis ?? 5000,
  });

  // Pool errors are emitted for idle clients; keep the process observable without
  // logging connection details or credentials that a driver error may contain.
  pool.on("error", (err) => {
    console.error("[PostgreSQL Pool] Idle client error", {
      name: err.name,
      code: "code" in err ? err.code : undefined,
    });
  });

  const dialect = new PostgresDialect({ pool });
  const db = new Kysely<DatabaseSchema>({ dialect });

  async function checkHealth(): Promise<boolean> {
    try {
      const result = await sql<{ ok: number }>`SELECT 1 as ok`.execute(db);
      return result.rows.length > 0 && result.rows[0].ok === 1;
    } catch {
      return false;
    }
  }

  async function close(): Promise<void> {
    await db.destroy();
  }

  return {
    db,
    pool,
    checkHealth,
    close,
  };
}
