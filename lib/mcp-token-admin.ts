import { randomBytes, createHash } from "node:crypto";
import { createClient } from "./supabase/server";

export type MintMcpTokenParams = { requesterEmail: string; ttlMinutes?: number; monthlyTokenBudget?: number };

/** Shared by app/api/mcp/token/route.ts and app/actions/mcp.ts's admin-UI mint action. */
export async function mintMcpToken(params: MintMcpTokenParams): Promise<{ token: string; expiresAt: string } | { error: string }> {
  // blueprint §3.5: "session-scoped MCP token (TTL 15 min)".
  const ttlMinutes = Math.min(Math.max(params.ttlMinutes || 15, 1), 15);
  const monthlyTokenBudget = Math.min(Math.max(params.monthlyTokenBudget || 200_000, 10_000), 5_000_000);

  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("mcp_tokens").insert({
    token_hash: tokenHash,
    requester_email: params.requesterEmail.trim().toLowerCase(),
    monthly_token_budget: monthlyTokenBudget,
    expires_at: expiresAt,
  });
  if (error) return { error: error.message };

  return { token: raw, expiresAt };
}
