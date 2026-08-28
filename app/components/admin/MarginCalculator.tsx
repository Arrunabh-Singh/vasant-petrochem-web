"use client";

import { useState } from "react";

export default function MarginCalculator() {
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("");

  const buyN = Number(buy) || 0;
  const sellN = Number(sell) || 0;
  const qtyN = Number(qty) || 0;

  const unitMargin = sellN - buyN;
  const gross = unitMargin * qtyN;
  const pct = sellN > 0 ? (unitMargin / sellN) * 100 : 0;
  const positive = unitMargin >= 0;

  return (
    <div className="rounded-xl border border-brand-gray bg-white p-4">
      <h2 className="mb-3 font-semibold text-brand-dark">What-if margin calculator</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm text-brand-charcoal/80">
          Buy cost / unit (₹)
          <input
            type="number"
            step="any"
            value={buy}
            onChange={(e) => setBuy(e.target.value)}
            placeholder="e.g. 72000"
            className="mt-1 w-full rounded-md border border-brand-gray px-3 py-2"
          />
        </label>
        <label className="text-sm text-brand-charcoal/80">
          Sell / benchmark / unit (₹)
          <input
            type="number"
            step="any"
            value={sell}
            onChange={(e) => setSell(e.target.value)}
            placeholder="e.g. 74500"
            className="mt-1 w-full rounded-md border border-brand-gray px-3 py-2"
          />
        </label>
        <label className="text-sm text-brand-charcoal/80">
          Quantity (units)
          <input
            type="number"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="e.g. 50"
            className="mt-1 w-full rounded-md border border-brand-gray px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-brand-gray/40 p-3">
          <div className="text-xs uppercase tracking-wider text-brand-charcoal/60">Unit margin</div>
          <div className={`text-lg font-bold ${positive ? "text-green-700" : "text-red-700"}`}>
            ₹{unitMargin.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-lg bg-brand-gray/40 p-3">
          <div className="text-xs uppercase tracking-wider text-brand-charcoal/60">Margin %</div>
          <div className={`text-lg font-bold ${positive ? "text-green-700" : "text-red-700"}`}>
            {pct.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg bg-brand-gray/40 p-3">
          <div className="text-xs uppercase tracking-wider text-brand-charcoal/60">Gross (qty × unit)</div>
          <div className={`text-lg font-bold ${positive ? "text-green-700" : "text-red-700"}`}>
            ₹{gross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-brand-charcoal/50">
        Manual entry only — pair with benchmark prices below for a quick deal-P&amp;L draft. Human-approved before any booking.
      </p>
    </div>
  );
}
