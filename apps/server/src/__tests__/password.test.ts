import { describe, expect, it } from "vitest";
import * as argon2 from "argon2";
import {
  ARGON2ID_OPTIONS,
  hashPassword,
  PasswordValidationError,
  verifyAndRehashPassword,
} from "../auth/password.js";
import { createConcurrencyLimiter } from "../auth/password-limiter.js";

const validPassword = "correct horse battery staple";

describe("password hashing", () => {
  it("stores only a PHC encoded Argon2id hash with the approved parameters and a unique salt", async () => {
    const first = await hashPassword(validPassword);
    const second = await hashPassword(validPassword);

    expect(first).toMatch(/^\$argon2id\$v=19\$.*m=19456.*\$[^$]+\$[^$]+$/);
    expect(first).not.toBe(validPassword);
    expect(first).not.toBe(second);
    expect(await argon2.verify(first, validPassword)).toBe(true);
  });

  it("rejects too short and too long passwords before hashing", async () => {
    await expect(hashPassword("short")).rejects.toBeInstanceOf(PasswordValidationError);
    await expect(hashPassword("é".repeat(513))).rejects.toBeInstanceOf(PasswordValidationError);
  });

  it("verifies a password and prepares an updated hash after parameter changes", async () => {
    const oldHash = await argon2.hash(validPassword, {
      type: argon2.argon2id,
      memoryCost: 8 * 1024,
      timeCost: 1,
      parallelism: 1,
      salt: Buffer.alloc(16, 5),
    });

    const result = await verifyAndRehashPassword(validPassword, oldHash);
    expect(result.valid).toBe(true);
    expect(result.replacementHash).toContain("m=19456");
    expect(await verifyAndRehashPassword("wrong password value", oldHash)).toEqual({
      valid: false,
    });
  });

  it("limits concurrent Argon2 work and rejects excess queued work", async () => {
    const limit = createConcurrencyLimiter(2, 2);
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const operation = (): Promise<void> => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      return new Promise((resolve) => {
        releases.push(() => {
          active -= 1;
          resolve();
        });
      });
    };

    const work = [limit(operation), limit(operation), limit(operation), limit(operation)];
    await Promise.resolve();
    await Promise.resolve();
    await expect(limit(operation)).rejects.toThrow("capacity");

    releases[0]();
    await Promise.resolve();
    await Promise.resolve();
    releases[1]();
    await Promise.resolve();
    await Promise.resolve();
    releases[2]();
    await Promise.resolve();
    await Promise.resolve();
    releases[3]();
    await Promise.all(work);

    expect(maximumActive).toBe(2);
    expect(ARGON2ID_OPTIONS.memoryCost).toBe(19 * 1024);
  });
});
