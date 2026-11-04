import { PassThrough, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { BootstrapError } from "../auth/bootstrap.js";
import { collectConfirmedPassword, safeErrorMessage } from "../cli/bootstrap-admin.js";
import { readHidden, type RawReadable } from "../cli/terminal.js";

function createFakeTerminal() {
  const input = new PassThrough() as PassThrough & RawReadable;
  input.isTTY = true;
  input.isRaw = false;
  const modes: boolean[] = [];
  input.setRawMode = (mode: boolean): void => {
    modes.push(mode);
    input.isRaw = mode;
  };

  let outputText = "";
  const output = new Writable({
    write(chunk, _encoding, callback) {
      outputText += chunk.toString();
      callback();
    },
  });
  return { input, output, modes, getOutput: () => outputText };
}

describe("hidden terminal input", () => {
  it("does not echo the password and restores terminal mode", async () => {
    const terminal = createFakeTerminal();
    const pending = readHidden("Password: ", terminal.input, terminal.output);
    terminal.input.write("secret-password-123\r");

    await expect(pending).resolves.toBe("secret-password-123");
    expect(terminal.getOutput()).toBe("Password: \n");
    expect(terminal.getOutput()).not.toContain("secret-password-123");
    expect(terminal.modes).toEqual([true, false]);
  });

  it("handles backspace, Ctrl+U, and Ctrl+C without exposing typed bytes", async () => {
    const terminal = createFakeTerminal();
    const pending = readHidden("Password: ", terminal.input, terminal.output);
    terminal.input.write("discard\u0015correct-password\u0008X\r");
    await expect(pending).resolves.toBe("correct-passworX");

    const interrupted = createFakeTerminal();
    const interruptedRead = readHidden("Password: ", interrupted.input, interrupted.output);
    interrupted.input.write("secret\u0003");
    await expect(interruptedRead).rejects.toMatchObject({ code: "interrupted" });
    expect(interrupted.getOutput()).not.toContain("secret");
    expect(interrupted.modes).toEqual([true, false]);
  });

  it("limits confirmation attempts and keeps internal error details out of terminal output", async () => {
    let reads = 0;
    let notices = "";
    const readSecret = async (): Promise<string> => {
      reads += 1;
      return reads % 2 === 1 ? "first password value" : "second password value";
    };

    await expect(
      collectConfirmedPassword(readSecret, (message) => {
        notices += message;
      }),
    ).rejects.toMatchObject({ code: "invalid-password" });
    expect(reads).toBe(6);
    expect(notices).toContain("tente novamente");
    expect(notices).not.toContain("first password value");
    expect(notices).not.toContain("second password value");

    const databaseError = new Error("password_hash leaked with a sensitive SQL value");
    expect(safeErrorMessage(databaseError)).not.toContain("sensitive SQL value");
    expect(safeErrorMessage(databaseError)).not.toContain("password_hash");
    expect(safeErrorMessage(new BootstrapError("administrator-exists"))).toContain("já existe");
  });

  it("accepts a matching password confirmation on the first attempt", async () => {
    let reads = 0;
    const password = await collectConfirmedPassword(
      async () => {
        reads += 1;
        return "a sufficiently long admin password";
      },
      () => undefined,
    );

    expect(password).toBe("a sufficiently long admin password");
    expect(reads).toBe(2);
  });
});
