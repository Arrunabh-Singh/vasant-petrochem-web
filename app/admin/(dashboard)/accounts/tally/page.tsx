import Link from "next/link";
import { getTallyCompanies, getTallyLedgers, getTallyStock, getLastTallySync } from "@/lib/tally";

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default async function AdminTallyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [companies, ledgers, stock, last] = await Promise.all([
    getTallyCompanies(),
    getTallyLedgers(q),
    getTallyStock(q),
    getLastTallySync(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-2">Tally Sync</h1>
      <p className="text-sm text-slate-500 mb-6">
        Pulled from Tally Prime (Parallels VM) by the Mac Hub cron.{" "}
        {last ? (
          <span>
            Last run: <span className="font-semibold">{new Date(last.ran_at).toLocaleString("en-IN")}</span>{" "}
            — {last.status === "ok" ? "success" : "failed"} ({last.companies} companies, {last.ledgers} ledgers,{" "}
            {last.stock} stock items)
            {last.error ? <span className="text-red-600"> — {last.error}</span> : null}
          </span>
        ) : (
          <span>No sync has run yet.</span>
        )}
      </p>

      <form method="get" action="/admin/accounts/tally" className="flex flex-wrap items-end gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search ledger or stock item…"
          className="w-full sm:w-80 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white hover:bg-brand transition-colors">
          Search
        </button>
        {q && (
          <Link href="/admin/accounts/tally" className="text-xs text-slate-500 underline px-2 py-2">
            clear
          </Link>
        )}
      </form>

      {companies.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Companies</h2>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <span key={c.name} className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand-dark">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-bold text-brand-dark mb-3">Ledgers ({ledgers.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Ledger</th>
                <th className="px-4 py-2 text-left">Group</th>
                <th className="px-4 py-2 text-right">Opening</th>
                <th className="px-4 py-2 text-right">Closing</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No ledgers synced yet.
                  </td>
                </tr>
              )}
              {ledgers.map((l) => (
                <tr key={`${l.company}-${l.name}`} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{l.company}</td>
                  <td className="px-4 py-2 font-semibold text-brand-dark">{l.name}</td>
                  <td className="px-4 py-2 text-slate-500">{l.parent ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(l.opening_amount)} {l.opening_type ?? ""}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(l.closing_amount)} {l.closing_type ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-dark mb-3">Stock Items ({stock.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Closing Qty</th>
                <th className="px-4 py-2 text-right">Closing Value</th>
                <th className="px-4 py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No stock items synced yet.
                  </td>
                </tr>
              )}
              {stock.map((s) => (
                <tr key={`${s.company}-${s.name}`} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{s.company}</td>
                  <td className="px-4 py-2 font-semibold text-brand-dark">{s.name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.parent ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(s.closing_qty)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">₹{fmt(s.closing_value)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(s.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
