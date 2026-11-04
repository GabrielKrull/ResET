import * as path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Migrator, FileMigrationProvider, type Kysely } from "kysely";
import { createDatabase } from "./connection.js";
import { loadConfig } from "../config.js";
import type { DatabaseSchema } from "./types.js";

export async function runMigrations(db: Kysely<DatabaseSchema>): Promise<void> {
  const migrationsFolder = path.resolve(import.meta.dirname, "migrations");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path: {
        join: (...segments: string[]) => pathToFileURL(path.join(...segments)).href,
      },
      migrationFolder: migrationsFolder,
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`[Migration] "${it.migrationName}" executed successfully.`);
    } else if (it.status === "Error") {
      console.error(`[Migration] "${it.migrationName}" failed.`);
    }
  });

  if (error) {
    console.error("[Migration] Failed to run migrations:", error);
    throw error;
  }
}

// Allow direct CLI execution: node migrate.js or npm run migrate
const isDirectCliExecution = (): boolean => {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url).toLowerCase();
    const executedFile = path.resolve(process.argv[1]).toLowerCase();
    return currentFile === executedFile;
  } catch {
    return false;
  }
};

if (isDirectCliExecution()) {
  const config = loadConfig();
  const { db, close } = createDatabase(config.DATABASE_URL);

  console.log(
    "[Migration] Running migrations against:",
    config.DATABASE_URL.replace(/:[^:@]+@/, ":****@"),
  );
  runMigrations(db)
    .then(async () => {
      console.log("[Migration] All migrations completed successfully.");
      await close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Migration] Migration runner error:", err);
      await close();
      process.exit(1);
    });
}
