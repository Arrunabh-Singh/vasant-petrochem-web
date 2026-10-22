import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTION_ALLOWLIST, READ_ALLOWLIST, parseScope, refusal } from "../lib/mcp-scope.ts";

test("every token may call the read tools", () => {
  for (const tool of READ_ALLOWLIST) {
    assert.equal(refusal("read-only", tool), null);
    assert.equal(refusal("propose", tool), null);
  }
});

test("only a propose-scoped token may call an action tool", () => {
  for (const tool of ACTION_ALLOWLIST) {
    assert.equal(refusal("read-only", tool), "token scope is read-only");
    assert.equal(refusal("anything-else", tool), "token scope is read-only");
    assert.equal(refusal("propose", tool), null);
  }
});

test("a tool on no allowlist is refused whatever the scope", () => {
  assert.equal(refusal("propose", "run_sql"), "tool not on an allowlist");
});

test("a mint request is read-only unless it asks for propose exactly", () => {
  assert.equal(parseScope("propose"), "propose");
  for (const v of [undefined, null, "", "PROPOSE", "admin", 1]) assert.equal(parseScope(v), "read-only");
});
