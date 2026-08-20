import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMcpServer, type McpIdentity } from "@/lib/mcp-tools";

export const runtime = "nodejs";

/**
 * blueprint §3.5: bearer-token auth (decision 10), not OAuth — a
 * proportionate choice for this wave. Tokens are minted from the admin
 * UI (app/actions/mcp.ts), hashed at rest, 15-minute TTL, scoped to the
 * requester's own Google identity so ai_action_log always records who
 * actually asked, not just "the AI."
 * ponytail: bearer-over-TLS, no OAuth 2.1 authorization-code flow — the
 * upgrade path if a remote connector (not just Claude Code) needs to
 * connect is documented in docs/OWNER_CHECKLIST.md.
 */
async function resolveIdentity(req: NextRequest): Promise<McpIdentity | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const tokenHash = createHash("sha256").update(authHeader.slice(7)).digest("hex");
  const admin = createAdminClient();
  const { data } = await admin
    .from("mcp_tokens")
    .select("id, requester_email, monthly_token_budget, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!data || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  return { tokenId: data.id, email: data.requester_email, monthlyBudget: data.monthly_token_budget };
}

async function handle(req: NextRequest): Promise<Response> {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Stateless: a fresh server+transport per request, matching Vercel
  // Functions' ephemeral lifecycle — no server-side session to lose
  // between invocations.
  const server = buildMcpServer(identity);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
export async function DELETE(req: NextRequest) {
  return handle(req);
}
