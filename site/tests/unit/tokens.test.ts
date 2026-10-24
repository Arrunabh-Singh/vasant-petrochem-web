import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileTokens } from "../../scripts/prepare.mjs";

const tokens = JSON.parse(readFileSync(new URL("../../../design-system/tokens.json", import.meta.url), "utf8"));

test("the design system's tokens compile, with type in rem so it follows the reader's font size", () => {
  const css = compileTokens(tokens);
  assert.match(css, /--gold: #cfa145;/);
  assert.match(css, /--t-display-xl: 900 5\.25rem\/5rem var\(--font-display\);/);
  assert.match(css, /--t-film: 900 7\.5rem\/7rem var\(--font-display\);/);
  assert.match(css, /--ease-out: cubic-bezier/);
  assert.doesNotMatch(css, /\{[a-z0-9-]+\}/, "every {reference} is resolved");
});

test("an unknown colour reference fails the build instead of shipping a broken token", () => {
  const broken = structuredClone(tokens);
  broken.color.tokens.push({ name: "oops", value: "{nope}" });
  assert.throws(() => compileTokens(broken), /cannot resolve \{nope\}/);
});
