import { describe, it, expect } from "vitest";
import { loadConfig } from "../config.js";

describe("Configuration Loader", () => {
  it("should load valid configuration with defaults", () => {
    const config = loadConfig({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
    });

    expect(config.DATABASE_URL).toBe("postgresql://postgres:postgres@localhost:5432/test_db");
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.NODE_ENV).toBe("development");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("should fail when DATABASE_URL is missing", () => {
    expect(() => {
      loadConfig({
        DATABASE_URL: "",
      });
    }).toThrowError(/DATABASE_URL is required/);
  });

  it("should parse custom PORT as a number", () => {
    const config = loadConfig({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
      PORT: "4000",
    });

    expect(config.PORT).toBe(4000);
  });
});
