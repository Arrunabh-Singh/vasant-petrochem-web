/**
 * Calls a database function through Supabase's REST API with the publishable
 * key only. The functions check the site token and their own limits; this
 * Worker holds no key that can read data (least privilege, ADR-0001).
 */
export type DbConfig = { url?: string | undefined; key?: string | undefined; fetchImpl?: typeof fetch };
export type RpcResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

export async function rpc<T>(fn: string, args: Record<string, unknown>, cfg: DbConfig): Promise<RpcResult<T>> {
  if (!cfg.url || !cfg.key) return { ok: false, status: 503, message: "database not configured" };
  try {
    const res = await (cfg.fetchImpl ?? fetch)(`${cfg.url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, message: (body as { message?: string } | null)?.message ?? `HTTP ${res.status}` };
    return { ok: true, data: body as T };
  } catch (err) {
    return { ok: false, status: 504, message: err instanceof Error ? err.name : "error" };
  }
}
