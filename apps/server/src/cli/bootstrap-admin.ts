import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createDatabase } from "../database/connection.js";
import { loadConfig } from "../config.js";
import { assertBootstrapAvailable, BootstrapError, createFirstAdmin } from "../auth/bootstrap.js";
import { validatePasswordSize } from "../auth/password.js";
import { readHidden, TerminalInputError } from "./terminal.js";

const MAX_PASSWORD_ATTEMPTS = 3;

async function readUsername(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new TerminalInputError("not-interactive");
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await readline.question("Nome de usuário do administrador: ");
  } finally {
    readline.close();
  }
}

export async function collectConfirmedPassword(
  readSecret: () => Promise<string>,
  notify: (message: string) => void,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_PASSWORD_ATTEMPTS; attempt += 1) {
    try {
      const password = await readSecret();
      const confirmation = await readSecret();
      validatePasswordSize(password);
      if (password !== confirmation) throw new Error("password-mismatch");
      return password;
    } catch (error) {
      if (error instanceof TerminalInputError && error.code === "interrupted") throw error;
      if (error instanceof TerminalInputError && error.code === "not-interactive") throw error;
      notify("Senha inválida. Confira o tamanho e a confirmação e tente novamente.\n");
    }
  }
  throw new BootstrapError("invalid-password");
}

async function readCredentials(): Promise<{ username: string; password: string }> {
  const username = await readUsername();
  const password = await collectConfirmedPassword(
    async () => readHidden("Senha do administrador (oculta): ", process.stdin),
    (message) => process.stdout.write(message),
  );
  return { username, password };
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof BootstrapError) {
    switch (error.code) {
      case "invalid-username":
        return "Nome de usuário deve conter 3–32 caracteres ASCII: letras, números, ponto, sublinhado ou hífen.";
      case "invalid-password":
        return "Limite de tentativas atingido ou tamanho de senha inválido.";
      case "administrator-exists":
        return "Bootstrap bloqueado: já existe um administrador.";
      case "interrupted":
        return "Bootstrap interrompido; nenhum administrador foi criado.";
    }
  }
  if (error instanceof TerminalInputError) {
    if (error.code === "not-interactive") return "Bootstrap requer um terminal interativo.";
    if (error.code === "too-long") return "A senha excede o tamanho máximo permitido.";
    if (error.code === "interrupted") {
      return "Bootstrap interrompido; nenhum administrador foi criado.";
    }
  }
  return "Falha no bootstrap; nenhum administrador foi criado. Verifique o banco e as migrations.";
}

async function main(): Promise<void> {
  let database: ReturnType<typeof createDatabase> | undefined;
  try {
    const config = loadConfig();
    database = createDatabase(config.DATABASE_URL, { max: 1 });
    await assertBootstrapAvailable(database.db);
    const credentials = await readCredentials();
    await createFirstAdmin(database.db, credentials);
    process.stdout.write("Administrador criado com sucesso.\n");
  } catch (error) {
    process.stderr.write(`${safeErrorMessage(error)}\n`);
    process.exitCode = 1;
  } finally {
    if (database) {
      try {
        await database.close();
      } catch {
        process.stderr.write("Falha ao encerrar a conexão com o banco.\n");
        process.exitCode = 1;
      }
    }
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()
) {
  void main();
}

export { main as runBootstrapCli, readCredentials, safeErrorMessage };
