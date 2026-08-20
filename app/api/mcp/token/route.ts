import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { mintMcpToken } from "@/lib/mcp-token-admin";

/**
 * Admin-only. Mints a bearer token for the MCP server (app/api/mcp) and
 * returns the raw value exactly once — only its SHA-256 hash is ever
 * stored, so this response is the one chance to copy it.
 */
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const requesterEmail = typeof body?.requesterEmail === "string" ? body.requesterEmail : admin.email;

  const result = await mintMcpToken({
    requesterEmail,
    ttlMinutes: Number(body?.ttlMinutes),
    monthlyTokenBudget: Number(body?.monthlyTokenBudget),
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result);
}
