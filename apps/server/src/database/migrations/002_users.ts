import { sql, type Kysely } from "kysely";
import type { DatabaseSchema } from "../types.js";

export async function up(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "serial", (column) => column.primaryKey())
    .addColumn("username", "varchar(32)", (column) => column.notNull().unique())
    .addColumn("password_hash", "text", (column) => column.notNull())
    .addColumn("is_admin", "boolean", (column) => column.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("users_username_format_check", sql`username ~ '^[a-z0-9._-]{3,32}$'`)
    .addCheckConstraint(
      "users_password_hash_format_check",
      sql`password_hash ~ '^\\$argon2id\\$v=19\\$m=[0-9]+,p=[0-9]+,t=[0-9]+\\$[A-Za-z0-9+/]+\\$[A-Za-z0-9+/]+$'`,
    )
    .execute();

  // A partial unique index is the final database-level guard against two admins.
  await sql`CREATE UNIQUE INDEX users_single_admin_idx ON users (is_admin) WHERE is_admin = true`.execute(
    db,
  );

  await db
    .updateTable("system_meta")
    .set({ value: "1.1.0" })
    .where("key", "=", "schema_version")
    .execute();
}

export async function down(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema.dropTable("users").ifExists().execute();
  await db
    .updateTable("system_meta")
    .set({ value: "1.0.0" })
    .where("key", "=", "schema_version")
    .execute();
}
