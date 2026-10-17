import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// VP-SEC-006: a "use client" file that imports a server-only module would
// ship (or try to ship) service-role / crypto code to the browser bundle.
// Names are matched on the import path, which is enough for this codebase's
// flat lib/ layout. ponytail: no transitive resolution; the build-output grep
// in the VP-SEC-006 PR covers what this misses.
const SERVER_ONLY = /(supabase\/admin|supabase\/server|\/(crypto|vault-key|hmac-ticket|device-ticket|upload-ticket|documents|rbac|notify|mcp-tools|mcp-token-admin|admin|tally|logistics|market))["']/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}

test("no 'use client' file imports a server-only module", () => {
  const offenders: string[] = [];
  for (const file of [...walk("app"), ...walk("lib")]) {
    const src = readFileSync(file, "utf8");
    if (!/^\s*["']use client["']/.test(src)) continue;
    // `import type` is erased at build; "use server" action modules are
    // the supported client->server bridge. Neither ships server code.
    for (const m of src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) {
      if (m[1].includes("/actions/")) continue;
      if (SERVER_ONLY.test(`${m[1]}"`)) offenders.push(`${file} -> ${m[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});
