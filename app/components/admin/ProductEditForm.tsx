"use client";

import { useActionState } from "react";
import { updateProduct, type ProductFormState } from "@/app/actions/products";
import type { AdminProduct } from "@/lib/admin";

const initialState: ProductFormState = { status: "idle" };

export default function ProductEditForm({ product, tdsUrl }: { product: AdminProduct; tdsUrl: string | null }) {
  const boundAction = updateProduct.bind(null, product.id, product.slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl bg-white rounded-xl border border-slate-200 p-8">
      <div>
        <label htmlFor="name" className="text-xs font-bold text-brand uppercase tracking-widest">Name</label>
        <input
          id="name" name="name" defaultValue={product.name} required
          className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
        />
      </div>

      <div>
        <label htmlFor="description" className="text-xs font-bold text-brand uppercase tracking-widest">Description</label>
        <textarea
          id="description" name="description" defaultValue={product.description} rows={4} required
          className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
        />
      </div>

      <div>
        <label htmlFor="packaging" className="text-xs font-bold text-brand uppercase tracking-widest">Packaging</label>
        <input
          id="packaging" name="packaging" defaultValue={product.packaging ?? ""}
          placeholder="e.g. 210L drums, bulk tanker"
          className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
        />
      </div>

      <div>
        <label htmlFor="specs" className="text-xs font-bold text-brand uppercase tracking-widest">
          Specs (JSON)
        </label>
        {/* ponytail: raw JSON textarea instead of an add/remove row builder — upgrade to a proper
            field-array UI if non-technical staff need to edit specs without touching JSON. */}
        <textarea
          id="specs" name="specs" defaultValue={JSON.stringify(product.specs, null, 2)} rows={6}
          className="w-full mt-1 font-mono text-xs border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input id="published" type="checkbox" name="published" defaultChecked={product.published} className="w-4 h-4 accent-brand" />
        <label htmlFor="published" className="text-sm font-medium text-slate-700">Published (visible on the public site)</label>
      </div>

      <div>
        <label htmlFor="tds" className="text-xs font-bold text-brand uppercase tracking-widest">TDS / SDS (PDF)</label>
        {tdsUrl && (
          <p className="text-xs text-slate-500 mt-1 mb-2">
            Current file: <a href={tdsUrl} target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:text-brand-accent">view PDF</a>
          </p>
        )}
        <input id="tds" type="file" name="tds" accept="application/pdf" className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 text-sm" />
      </div>

      {state.status === "error" && <p className="text-red-600 text-sm">{state.message}</p>}
      {state.status === "success" && <p className="text-brand-accent text-sm font-bold">Saved.</p>}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "SAVING..." : "SAVE CHANGES"}
      </button>
    </form>
  );
}
