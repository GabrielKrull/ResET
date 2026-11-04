import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { BootstrapError, createFirstAdmin } from "../../auth/bootstrap.js";
import { hashPassword, verifyAndRehashPassword } from "../../auth/password.js";
import { createDatabase } from "../../database/connection.js";
import { runMigrations } from "../../database/migrate.js";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is required to run the PostgreSQL integration test.");
}

const database = createDatabase(dbUrl);
const validPassword = "friend-group-admin-password";

beforeAll(async () => {
  const isConnected = await database.checkHealth();
  if (!isConnected) {
    throw new Error("PostgreSQL is required for the integration test but is unreachable.");
  }
  await runMigrations(database.db);
});

beforeEach(async () => {
  await database.db.deleteFrom("users").execute();
});

afterAll(async () => {
  await database.close();
});

describe("PostgreSQL integration", () => {
  it("runs migrations, verifies health, and records the schema version", async () => {
    expect(await database.checkHealth()).toBe(true);

    const meta = await database.db
      .selectFrom("system_meta")
      .selectAll()
      .where("key", "=", "schema_version")
      .executeTakeFirst();

    expect(meta?.value).toBe("1.1.0");
    expect(await database.db.introspection.getTables()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "users" })]),
    );
  });

  it("creates the first administrator with only an Argon2id PHC hash", async () => {
    await createFirstAdmin(database.db, {
      username: "  Friend.Admin  ",
      password: validPassword,
    });

    const admin = await database.db
      .selectFrom("users")
      .selectAll()
      .where("is_admin", "=", true)
      .executeTakeFirstOrThrow();

    expect(admin.username).toBe("friend.admin");
    expect(admin.password_hash).toMatch(/^\$argon2id\$v=19\$.*m=19456/);
    expect(admin.password_hash).not.toContain(validPassword);
    expect(await verifyAndRehashPassword(validPassword, admin.password_hash)).toEqual({
      valid: true,
    });
  });

  it("rejects a plaintext password at the database boundary", async () => {
    await expect(
      database.db
        .insertInto("users")
        .values({
          username: "plaintextuser",
          password_hash: validPassword,
          is_admin: false,
        })
        .execute(),
    ).rejects.toThrow();
    expect(await database.db.selectFrom("users").selectAll().execute()).toHaveLength(0);
  });

  it("blocks bootstrap after an administrator already exists without hashing again", async () => {
    await createFirstAdmin(database.db, { username: "firstadmin", password: validPassword });
    let hashCalled = false;

    await expect(
      createFirstAdmin(
        database.db,
        { username: "secondadmin", password: validPassword },
        {
          hashPasswordFn: async () => {
            hashCalled = true;
            return "must-not-be-used";
          },
        },
      ),
    ).rejects.toMatchObject({ code: "administrator-exists" } satisfies Partial<BootstrapError>);

    expect(hashCalled).toBe(false);
    expect(await database.db.selectFrom("users").selectAll().execute()).toHaveLength(1);
  });

  it("serializes simultaneous bootstrap attempts so only one admin is created", async () => {
    const attempts = await Promise.allSettled([
      createFirstAdmin(database.db, { username: "adminone", password: validPassword }),
      createFirstAdmin(database.db, { username: "admintwo", password: validPassword }),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(await database.db.selectFrom("users").selectAll().execute()).toHaveLength(1);
    expect(
      await database.db.selectFrom("users").selectAll().where("is_admin", "=", true).execute(),
    ).toHaveLength(1);
  });

  it("rolls back if the database rejects the insert", async () => {
    await sql`CREATE FUNCTION reject_bootstrap_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'integration test insert failure'; END; $$`.execute(database.db);
    await sql`CREATE TRIGGER reject_bootstrap_insert_trigger BEFORE INSERT ON users
      FOR EACH ROW EXECUTE FUNCTION reject_bootstrap_insert()`.execute(database.db);

    try {
      await expect(
        createFirstAdmin(database.db, { username: "adminfailure", password: validPassword }),
      ).rejects.toThrow();
    } finally {
      await sql`DROP TRIGGER IF EXISTS reject_bootstrap_insert_trigger ON users`.execute(
        database.db,
      );
      await sql`DROP FUNCTION IF EXISTS reject_bootstrap_insert()`.execute(database.db);
    }

    expect(await database.db.selectFrom("users").selectAll().execute()).toHaveLength(0);
  });

  it("rolls back when bootstrap is interrupted during hashing", async () => {
    const controller = new AbortController();
    let startedHashing!: () => void;
    let releaseHashing!: () => void;
    const hashingStarted = new Promise<void>((resolve) => {
      startedHashing = resolve;
    });
    const hashingPaused = new Promise<void>((resolve) => {
      releaseHashing = resolve;
    });

    const creation = createFirstAdmin(
      database.db,
      { username: "admininterrupt", password: validPassword },
      {
        signal: controller.signal,
        hashPasswordFn: async () => {
          startedHashing();
          await hashingPaused;
          return "$argon2id$test-hash";
        },
      },
    );
    await hashingStarted;
    controller.abort();
    releaseHashing();

    await expect(creation).rejects.toMatchObject({ code: "interrupted" });
    expect(await database.db.selectFrom("users").selectAll().execute()).toHaveLength(0);
  });

  it("keeps the database singleton constraint even when inserts bypass the CLI", async () => {
    const encodedHash = await hashPassword(validPassword);
    await database.db
      .insertInto("users")
      .values({
        username: "adminone",
        password_hash: encodedHash,
        is_admin: true,
      })
      .execute();

    await expect(
      database.db
        .insertInto("users")
        .values({
          username: "admintwo",
          password_hash: encodedHash,
          is_admin: true,
        })
        .execute(),
    ).rejects.toThrow();
  });
});
