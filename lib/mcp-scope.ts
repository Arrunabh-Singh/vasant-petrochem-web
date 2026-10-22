/**
 * Which MCP tools a token may call. The lists exist as explicit, auditable
 * allowlists even though lib/mcp-tools.ts only registers these tools:
 * belt-and-braces against a tool being added without updating them.
 *
 * Every token may read. Only a token minted with the "propose" scope (a
 * deliberate choice on the hub's Security page) may call a tool that
 * proposes a change, and even then a different person approves it in the
 * hub (CLAUDE.md §4.6: action tools behind an explicit allowlist).
 */
export const READ_ALLOWLIST = [
  "get_receivables",
  "get_ledger_aging",
  "get_item_stats",
  "get_gst_summary",
  "get_document_index",
  "list_offers",
] as const;

export const ACTION_ALLOWLIST = ["propose_offer"] as const;

export const MCP_SCOPES = ["read-only", "propose"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** The scope a mint request asks for; anything but "propose" is read-only. */
export const parseScope = (value: unknown): McpScope => (value === "propose" ? "propose" : "read-only");

/** Null when the token may call the tool, otherwise why not (for the audit log). */
export function refusal(scope: string, toolName: string): string | null {
  if ((READ_ALLOWLIST as readonly string[]).includes(toolName)) return null;
  if (!(ACTION_ALLOWLIST as readonly string[]).includes(toolName)) return "tool not on an allowlist";
  return scope === "propose" ? null : "token scope is read-only";
}
