import { spawnSync } from "node:child_process";
import fs from "node:fs";

const run = spawnSync(
  process.execPath,
  ["scripts/source-expansion.mjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      GOO_JOBB_WORLDWIDE: "1"
    }
  }
);

if (run.error) {
  console.error(run.error);
  process.exit(1);
}

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

if (fs.existsSync("scripts/goo-jobb-validate.mjs")) {
  const check = spawnSync(
    process.execPath,
    ["scripts/goo-jobb-validate.mjs"],
    { stdio: "inherit" }
  );

  if (check.status !== 0) {
    process.exit(check.status ?? 1);
  }
}

console.log("GOO-JOBB MASTER SYNC: SUCCESS");
process.exit(0);
