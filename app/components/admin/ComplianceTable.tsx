"use client";

import { useActionState, useTransition } from "react";
import { createComplianceItem, archiveComplianceItem, type ComplianceFormState } from "@/app/actions/compliance";
import type { ComplianceItem } from "@/lib/admin";

const KINDS = ["licence", "insurance", "contract", "eway", "registration"];
const initialState: ComplianceFormState = { status: "idle" };

function urgencyStyle(days: number) {
  if (days < 0) return "bg-red-100 text-red-700";
  if (days <= 30) return "bg-red-100 text-red-700";
  if (days <= 90) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function ComplianceTable({ items }: { items: ComplianceItem[] }) {
  const [state, formAction, pending] = useActionState(createComplianceItem, initialState);
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Add a compliance item</h2>
        <form action={formAction} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Kind</label>
            <select name="kind" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Label</label>
            <input name="label" required placeholder="Factory Licence" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Identifier</label>
            <input name="identifier" placeholder="optional" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Expires on</label>
            <input name="expiresOn" type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Owner email</label>
            <input name="ownerEmail" type="email" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="lg:col-span-5">
            <button type="submit" disabled={pending} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white disabled:opacity-60">
              {pending ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
        {state.status === "error" && <p className="text-red-600 text-xs mt-2">{state.message}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Days left</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-brand-dark">{c.label}{c.identifier ? ` (${c.identifier})` : ""}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.kind}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{c.owner_email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.expires_on}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 ${urgencyStyle(c.days_remaining)}`}>
                    {c.days_remaining < 0 ? "lapsed" : `${c.days_remaining}d`}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startTransition(() => archiveComplianceItem(c.id))}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-slate-400 text-center py-16 text-sm">No compliance items tracked yet.</p>}
      </div>
    </div>
  );
}
