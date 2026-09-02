/** Preflight: report DATABASE_URL host/db without secrets. */
import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

let host = "";
let port = "";
let database = "";
let user = "";
try {
  const parsed = new URL(url);
  host = parsed.hostname;
  port = parsed.port || "5432";
  database = (parsed.pathname || "/").replace(/^\//, "").split("?")[0] ?? "";
  user = parsed.username;
} catch {
  console.error("DATABASE_URL parse failed");
  process.exit(1);
}

const isNeon = /neon\.tech|\.neon\./i.test(host) || /neon/i.test(url.split("@").pop() ?? "");
const isLocalHost = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
const looksLocal = isLocalHost && !isNeon;

console.log(
  JSON.stringify(
    {
      host,
      port,
      database,
      user,
      isNeon,
      isLocalHost,
      looksLocal,
      safeToWrite: looksLocal,
    },
    null,
    2,
  ),
);

if (!looksLocal) {
  console.error("REFUSING: database is not unquestionably local");
  process.exit(2);
}
