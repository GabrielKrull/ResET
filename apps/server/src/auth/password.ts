import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { createConcurrencyLimiter } from "./password-limiter.js";

export const ARGON2ID_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
});

export const PASSWORD_MIN_CODE_POINTS = 12;
export const PASSWORD_MAX_UTF8_BYTES = 1024;

const MAX_HASH_MEMORY_KIB = 64 * 1024;
const MAX_HASH_TIME_COST = 5;
const MAX_HASH_PARALLELISM = 4;
const runArgon2 = createConcurrencyLimiter(2, 4);

export class PasswordValidationError extends Error {
  constructor() {
    super("Password does not meet the size limits.");
    this.name = "PasswordValidationError";
  }
}

export function validatePasswordSize(password: string): void {
  const byteLength = Buffer.byteLength(password, "utf8");
  const codePointLength = Array.from(password).length;
  if (codePointLength < PASSWORD_MIN_CODE_POINTS || byteLength > PASSWORD_MAX_UTF8_BYTES) {
    throw new PasswordValidationError();
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordSize(password);
  const salt = randomBytes(16);
  return runArgon2(() =>
    argon2.hash(password, {
      ...ARGON2ID_OPTIONS,
      salt,
    }),
  );
}

export interface PasswordVerificationResult {
  valid: boolean;
  replacementHash?: string;
}

function isWithinVerificationLimits(encodedHash: string): boolean {
  if (encodedHash.length > 512) return false;
  const match = /^\$argon2id\$v=19\$([^$]+)\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/.exec(encodedHash);
  if (!match) return false;

  const parameters = new Map<string, number>();
  for (const part of match[1].split(",")) {
    const [key, value, extra] = part.split("=");
    if (!key || !value || extra !== undefined || parameters.has(key)) return false;
    parameters.set(key, Number(value));
  }
  if (parameters.size !== 3) return false;

  const memoryCost = parameters.get("m") ?? 0;
  const timeCost = parameters.get("t") ?? 0;
  const parallelism = parameters.get("p") ?? 0;
  return (
    memoryCost >= 8 * parallelism &&
    memoryCost <= MAX_HASH_MEMORY_KIB &&
    timeCost >= 1 &&
    timeCost <= MAX_HASH_TIME_COST &&
    parallelism >= 1 &&
    parallelism <= MAX_HASH_PARALLELISM
  );
}

/** Verify a PHC encoded Argon2id digest and prepare an upgraded digest when needed. */
export async function verifyAndRehashPassword(
  password: string,
  encodedHash: string,
): Promise<PasswordVerificationResult> {
  try {
    validatePasswordSize(password);
  } catch {
    return { valid: false };
  }
  if (!isWithinVerificationLimits(encodedHash)) return { valid: false };

  let valid = false;
  try {
    valid = await runArgon2(() => argon2.verify(encodedHash, password));
  } catch {
    return { valid: false };
  }
  if (!valid) return { valid: false };

  if (argon2.needsRehash(encodedHash, ARGON2ID_OPTIONS)) {
    return { valid: true, replacementHash: await hashPassword(password) };
  }
  return { valid: true };
}
