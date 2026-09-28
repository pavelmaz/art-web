#!/usr/bin/env node
/**
 * Deletes the page cache of old deploys from the fineartfree-next-cache bucket.
 *
 * OpenNext keys every cached page under incremental-cache/<BUILD_ID>/, and each
 * deploy gets a new BUILD_ID — so after a deploy nothing ever reads the previous
 * builds' pages again, yet they stayed for 120 days (28 Sep 2026: 49 build folders,
 * 329 GB, +50 GB/day). This sets an R2 lifecycle rule "delete after 1 day" on every
 * build folder except the live one (R2 does the deleting, free), and drops rules
 * for folders that are already gone. Other lifecycle rules are kept as they are.
 *
 * Runs after `npm run cf:deploy` (chained in package.json); safe to run any time.
 *   node scripts/prune-next-cache.mjs            # uses .next/BUILD_ID as the live build
 *   node scripts/prune-next-cache.mjs --dry      # show what it would do
 *
 * Auth: CLOUDFLARE_API_TOKEN if set, otherwise wrangler's own login (refreshed by
 * `wrangler whoami`), which is how deploys run on this Mac.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ACCOUNT = "aa4efd8976548f5208fd58f84c7c81be";
const BUCKET = "fineartfree-next-cache";
const PREFIX = "incremental-cache/";
const RULE_PREFIX = "prune-build-";
const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function apiToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  execFileSync("npx", ["wrangler", "whoami"], { cwd: ROOT, stdio: "ignore" }); // refreshes the OAuth token
  const cfg = fs.readFileSync(path.join(os.homedir(), "Library/Preferences/.wrangler/config/default.toml"), "utf8");
  const token = /oauth_token\s*=\s*"([^"]+)"/.exec(cfg)?.[1];
  if (!token) throw new Error("No Cloudflare token: set CLOUDFLARE_API_TOKEN or run `wrangler login`");
  return token;
}

const TOKEN = apiToken();
async function api(pathname, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json();
  if (!body.success) throw new Error(`${pathname}: ${JSON.stringify(body.errors)}`);
  return body;
}

const liveBuild = fs.readFileSync(path.join(ROOT, ".next/BUILD_ID"), "utf8").trim();
if (!/^[\w-]{10,}$/.test(liveBuild)) throw new Error(`Unexpected BUILD_ID "${liveBuild}"`);

const listing = await api(`/objects?${new URLSearchParams({ delimiter: "/", prefix: PREFIX, per_page: "1000" })}`);
const folders = (listing.result_info?.delimited ?? []).filter((p) => p.startsWith(PREFIX));
const liveFolder = `${PREFIX}${liveBuild}/`;
if (!folders.includes(liveFolder)) {
  // The live build has cached nothing yet (just deployed) — still fine, but say so.
  console.log(`note: live build ${liveBuild} has no cached pages yet`);
}
const old = folders.filter((f) => f !== liveFolder);

const current = (await api("/lifecycle")).result?.rules ?? [];
const keep = current.filter((r) => !r.id.startsWith(RULE_PREFIX));
const pruneRules = old.map((folder) => ({
  id: `${RULE_PREFIX}${folder.slice(PREFIX.length, -1)}`,
  enabled: true,
  conditions: { prefix: folder },
  deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } },
}));

console.log(`live build: ${liveBuild}; ${folders.length} build folders, ${old.length} old → delete after 1 day`);
if (DRY) {
  console.log(pruneRules.map((r) => `  ${r.conditions.prefix}`).join("\n"));
  process.exit(0);
}
await api("/lifecycle", { method: "PUT", body: JSON.stringify({ rules: [...keep, ...pruneRules] }) });
console.log(`lifecycle updated: ${keep.length} rules kept, ${pruneRules.length} prune rules`);
