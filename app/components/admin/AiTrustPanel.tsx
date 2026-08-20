"use client";

import { useActionState, useTransition } from "react";
import { mintToken, revokeMcpToken, type MintTokenState } from "@/app/actions/mcp";
import type { AiActionRow, McpTokenRow } from "@/lib/admin";

const initialState: MintTokenState = { status: "idle" };

const STATUS_STYLES: Record<string, string> = {
  executed: "bg-emerald-100 text-emerald-700",
  allowed: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

export default function AiTrustPanel({ tokens, actions }: { tokens: McpTokenRow[]; actions: AiActionRow[] }) {
  const [state, formAction, pending] = useActionState(mintToken, initialState);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-1">MCP tokens</h2>
        <p className="text-slate-500 text-sm mb-4">
          Read-only, scope-pinned, 15-minute TTL — no model-authored SQL, every call logged below whether allowed or refused.
        </p>
        <form action={formAction} className="grid sm:grid-cols-3 gap-3 items-end mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Requester email</label>
            <input name="requesterEmail" type="email" required placeholder="you@vasantpetrochem.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">TTL (minutes, max 15)</label>
            <input name="ttlMinutes" type="number" min={1} max={15} defaultValue={15} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <button type="submit" disabled={pending} className="w-full text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white disabled:opacity-60">
              {pending ? "Minting…" : "Mint token"}
            </button>
          </div>
        </form>
        {state.status === "success" && state.token && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs font-bold text-amber-800 mb-1">Copy this now — it will not be shown again:</p>
            <code className="text-xs break-all">{state.token}</code>
          </div>
        )}
        {state.status === "error" && <p className="text-red-600 text-xs mb-4">{state.message}</p>}

        <table className="w-full text-sm">
          <tbody>
            {tokens.map((t) => {
              const isLive = !t.revoked_at && new Date(t.expires_at) > new Date();
              return (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-2">{t.requester_email}</td>
                  <td className="py-2 text-xs text-slate-500">budget {t.monthly_token_budget.toLocaleString("en-IN")}/mo</td>
                  <td className="py-2 text-xs text-slate-500">{isLive ? "live" : t.revoked_at ? "revoked" : "expired"}</td>
                  <td className="py-2 text-right">
                    {isLive && (
                      <button onClick={() => startTransition(() => revokeMcpToken(t.id))} className="text-xs text-red-600 hover:underline">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tokens.length === 0 && <p className="text-slate-400 text-xs">No tokens minted yet.</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">AI activity</h2>
        <p className="text-slate-500 text-sm mb-4">What the AI did, tried, and was refused — and what it cost.</p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">When</th><th className="py-2">Requester</th><th className="py-2">Tool</th><th className="py-2">Status</th><th className="py-2">Rows</th><th className="py-2">Tokens</th></tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(a.created_at).toLocaleString("en-IN")}</td>
                <td className="py-2 text-xs">{a.requester_email}</td>
                <td className="py-2 font-mono text-xs">{a.tool_name}</td>
                <td className="py-2">
                  <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${STATUS_STYLES[a.status] ?? "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                </td>
                <td className="py-2 text-xs text-slate-500">{a.row_count ?? "—"}</td>
                <td className="py-2 text-xs text-slate-500">{((a.input_tokens ?? 0) + (a.output_tokens ?? 0)) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {actions.length === 0 && <p className="text-slate-400 text-xs">No AI activity yet.</p>}
      </div>
    </div>
  );
}
