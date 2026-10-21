"use client";

import { useActionState, useState, useTransition } from "react";
import { proposeOffer, reviewOffer, type OfferFormState } from "@/app/actions/offers";

export type Offer = {
  id: string;
  product_slug: string;
  title: string;
  quantity: number;
  uom: string;
  location: string;
  basis: string;
  valid_until: string;
  notes: string | null;
  status: "pending" | "published" | "withdrawn";
  proposed_by: string;
  proposed_via: "hub" | "mcp";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

const UOMS = ["MT", "kL", "L", "kg", "drums", "pails"];
const STATUS_STYLES: Record<Offer["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  withdrawn: "bg-slate-100 text-slate-500",
};
const initialState: OfferFormState = { status: "idle" };
const input = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm";

export default function OffersTable({ offers, products, currentEmail }: { offers: Offer[]; products: { slug: string; name: string }[]; currentEmail: string }) {
  const [state, formAction, proposing] = useActionState(proposeOffer, initialState);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const review = (id: string, action: "publish" | "withdraw") =>
    startTransition(async () => {
      const result = await reviewOffer(id, action);
      setReviewError(result.status === "error" ? (result.message ?? "The offer could not be updated.") : null);
    });

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Propose a lot</h2>
        <form action={formAction} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="text-xs text-slate-500">
            Product
            <select name="product_slug" required className={`${input} mt-1`}>
              {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500 lg:col-span-2">
            Title, as buyers will see it
            <input name="title" required minLength={3} maxLength={120} placeholder="20 MT Base Oil SN500 in drums" className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Valid until
            <input name="valid_until" type="date" required min={today} className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Quantity
            <input name="quantity" type="number" required min="0.001" step="0.001" className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Unit
            <select name="uom" required className={`${input} mt-1`}>
              {UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Location
            <input name="location" required maxLength={120} placeholder="Mangaliya, Indore" className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Basis
            <input name="basis" required maxLength={120} placeholder="Ex-works" className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500 lg:col-span-3">
            Notes (optional, public)
            <input name="notes" maxLength={500} className={`${input} mt-1`} />
          </label>
          <button type="submit" disabled={proposing} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white disabled:opacity-60">
            {proposing ? "Proposing…" : "Propose"}
          </button>
        </form>
        {state.message && <p className={`text-xs mt-3 ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</p>}
        <p className="text-xs text-slate-400 mt-3">A proposal goes live only when someone other than its proposer publishes it. Prices are never shown on the board.</p>
      </div>

      {reviewError && <p className="text-red-600 text-xs mb-3" role="alert">{reviewError}</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Valid until</th>
              <th className="px-4 py-3">Proposed by</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const mine = o.proposed_by.toLowerCase() === currentEmail.toLowerCase();
              return (
                <tr key={o.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <p className="font-bold text-brand-dark">{o.title}</p>
                    <p className="text-slate-400 text-xs">{o.product_slug} · {o.location} · {o.basis}</p>
                    {o.notes && <p className="text-slate-500 text-xs mt-1 max-w-xs">{o.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.quantity} {o.uom}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{o.valid_until}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {o.proposed_by}
                    {o.proposed_via === "mcp" && <span className="ml-1 rounded bg-violet-100 text-violet-700 px-1.5 py-0.5">AI agent</span>}
                    {o.approved_by && <p className="text-slate-400 mt-1">Published by {o.approved_by}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    {o.status === "pending" && !mine && (
                      <button disabled={busy} onClick={() => review(o.id, "publish")} className="text-xs font-bold text-brand-accent hover:underline disabled:opacity-60">
                        Publish
                      </button>
                    )}
                    {o.status === "pending" && mine && <span className="text-xs text-slate-400">Needs another approver</span>}
                    {o.status !== "withdrawn" && (
                      <button disabled={busy} onClick={() => review(o.id, "withdraw")} className="text-xs font-bold text-red-600 hover:underline disabled:opacity-60">
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {offers.length === 0 && <p className="text-slate-400 text-center py-16 text-sm">No lots yet. Propose one above.</p>}
      </div>
    </div>
  );
}
