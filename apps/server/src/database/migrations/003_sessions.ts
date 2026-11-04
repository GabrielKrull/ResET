import { sql, type Kysely } from "kysely";
import type { DatabaseSchema } from "../types.js";

export async function up(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema
    .createTable("sessions")
    .addColumn("id", "serial", (column) => column.primaryKey())
    .addColumn("user_id", "integer", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "char(64)", (column) => column.notNull().unique())
    .addColumn("created_at", "timestamptz", (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn("last_activity_at", "timestamptz", (column) => column.notNull())
    .addColumn("idle_expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("absolute_expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("revoked_at", "timestamptz")
    .addCheckConstraint(
      "sessions_expiration_order_check",
      sql`absolute_expires_at > created_at AND idle_expires_at <= absolute_expires_at`,
    )
    .execute();

  await db.schema.createIndex("sessions_user_id_idx").on("sessions").column("user_id").execute();

  await db
    .updateTable("system_meta")
    .set({ value: "1.2.0" })
    .where("key", "=", "schema_version")
    .execute();
}

export async function down(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema.dropTable("sessions").ifExists().execute();
  await db
    .updateTable("system_meta")
    .set({ value: "1.1.0" })
    .where("key", "=", "schema_version")
    .execute();
}
