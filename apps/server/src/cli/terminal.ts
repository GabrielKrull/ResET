import { Readable, Writable } from "node:stream";

export class TerminalInputError extends Error {
  constructor(readonly code: "not-interactive" | "interrupted" | "too-long" | "input-closed") {
    super(code);
    this.name = "TerminalInputError";
  }
}

export interface RawReadable extends Readable {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => void;
}

export async function readHidden(
  prompt: string,
  input: RawReadable = process.stdin,
  output: Writable = process.stdout,
  maxUtf8Bytes = 1024,
): Promise<string> {
  if (!input.isTTY || !input.setRawMode) throw new TerminalInputError("not-interactive");

  const previousRawMode = input.isRaw ?? false;

  let value = "";
  let escapeSequence = false;

  try {
    input.setRawMode(true);
    input.setEncoding("utf8");
    output.write(prompt);
    return await new Promise<string>((resolve, reject) => {
      const cleanup = (): void => {
        input.removeListener("data", onData);
        input.removeListener("end", onEnd);
        input.removeListener("error", onError);
      };
      const finish = (error?: Error): void => {
        cleanup();
        if (error) reject(error);
        else resolve(value);
      };
      const onEnd = (): void => finish(new TerminalInputError("input-closed"));
      const onError = (): void => finish(new TerminalInputError("input-closed"));
      const onData = (chunk: Buffer | string): void => {
        for (const character of String(chunk)) {
          if (escapeSequence) {
            if (character >= "@" && character <= "~") escapeSequence = false;
            continue;
          }
          if (character === "\u001b") {
            escapeSequence = true;
            continue;
          }
          if (character === "\u0003") {
            finish(new TerminalInputError("interrupted"));
            return;
          }
          if (character === "\r" || character === "\n") {
            finish();
            return;
          }
          if (character === "\u0008" || character === "\u007f") {
            value = Array.from(value).slice(0, -1).join("");
            continue;
          }
          if (character === "\u0015") {
            value = "";
            continue;
          }
          if (character < " " || character === "\u007f") continue;
          value += character;
          if (Buffer.byteLength(value, "utf8") > maxUtf8Bytes) {
            finish(new TerminalInputError("too-long"));
            return;
          }
        }
      };

      input.on("data", onData);
      input.once("end", onEnd);
      input.once("error", onError);
      input.resume();
    });
  } finally {
    input.setRawMode(previousRawMode);
    input.pause();
    output.write("\n");
  }
}
