"use client";

import { useActionState, useTransition } from "react";
import { requestApproval, decideApproval, type ApprovalFormState } from "@/app/actions/approvals";
import type { ApprovalRequest } from "@/lib/admin";

const KINDS = ["expense", "purchase_order", "payout", "other"];
const initialState: ApprovalFormState = { status: "idle" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ApprovalsTable({ requests, currentEmail }: { requests: ApprovalRequest[]; currentEmail: string }) {
  const [state, formAction, pending] = useActionState(requestApproval, initialState);
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Request approval</h2>
        <form action={formAction} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Kind</label>
            <select name="kind" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Subject</label>
            <input name="subject" required placeholder="Diesel purchase, June" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Amount (₹)</label>
            <input name="amount" type="number" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <button type="submit" disabled={pending} className="w-full text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white disabled:opacity-60">
              {pending ? "Submitting…" : "Submit"}
            </button>
          </div>
          <div className="lg:col-span-4">
            <label className="text-xs text-slate-500 block mb-1">Reason</label>
            <input name="reason" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </form>
        {state.status === "error" && <p className="text-red-600 text-xs mt-2">{state.message}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Requested by</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const isSelf = r.requested_by === currentEmail;
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-brand-dark">{r.subject}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.kind}</td>
                  <td className="px-4 py-3 text-slate-600">{r.amount != null ? `₹${r.amount.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.requested_by}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {r.status === "pending" && !isSelf && (
                      <>
                        <button onClick={() => startTransition(() => decideApproval(r.id, "approved"))} className="text-xs font-bold text-brand-accent hover:underline">
                          Approve
                        </button>
                        <button onClick={() => startTransition(() => decideApproval(r.id, "rejected"))} className="text-xs font-bold text-red-600 hover:underline">
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === "pending" && isSelf && (
                      <span className="text-xs text-slate-400" title="Maker-checker: you can't approve your own request">
                        awaiting another approver
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-slate-400 text-center py-16 text-sm">No approval requests yet.</p>}
      </div>
    </div>
  );
}
