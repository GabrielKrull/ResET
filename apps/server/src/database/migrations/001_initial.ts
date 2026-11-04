import { sql, type Kysely } from "kysely";
import type { DatabaseSchema } from "../types.js";

export async function up(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema
    .createTable("system_meta")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("key", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  await db
    .insertInto("system_meta")
    .values({
      key: "schema_version",
      value: "1.0.0",
    })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: "1.0.0" }))
    .execute();
}

export async function down(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema.dropTable("system_meta").ifExists().execute();
}
