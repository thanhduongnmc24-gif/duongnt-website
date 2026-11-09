import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const port = String(process.env.PORT || "3000");
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

console.log(`[start] Starting Next.js on 0.0.0.0:${port}`);

const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "0.0.0.0", "--port", port],
  {
    env: process.env,
    stdio: "inherit",
  },
);

server.on("error", (error) => {
  console.error("[start] Unable to start Next.js:", error);
  process.exit(1);
});

server.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[start] Next.js stopped by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
