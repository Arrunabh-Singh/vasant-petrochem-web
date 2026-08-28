import { getBenchmarksAdmin } from "@/lib/market";
import { createBenchmark } from "@/app/actions/market";
import MarginCalculator from "@/app/components/admin/MarginCalculator";

export default async function BenchmarksPage() {
  const rows = await getBenchmarksAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Market &amp; margins</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">
          Manual benchmark entry (Platts / Argus / MOPS) to start — later automate. Feeds deal-P&amp;L drafts.
        </p>
      </div>

      <MarginCalculator />

      <div className="overflow-x-auto rounded-xl border border-brand-gray bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-gray/40 text-brand-charcoal/80">
            <tr>
              <th className="px-3 py-2 text-left">Grade</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">As of</th>
              <th className="px-3 py-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-charcoal/50">
                  No benchmarks yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-gray/20">
                <td className="px-3 py-2 font-medium">{r.grade}</td>
                <td className="px-3 py-2">
                  {r.price} {r.currency ?? "USD"}/{r.uom ?? "bbl"}
                </td>
                <td className="px-3 py-2">{r.as_of}</td>
                <td className="px-3 py-2">{r.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={createBenchmark}
        className="space-y-4 rounded-xl border border-brand-gray bg-white p-4"
      >
        <h2 className="font-semibold text-brand-dark">New benchmark</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required name="grade" placeholder="Grade (Dated Brent, MOPS HSD…)" className="rounded-md border border-brand-gray px-3 py-2" />
          <input required name="price" type="number" step="any" placeholder="Price" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="currency" placeholder="Currency (USD)" defaultValue="USD" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="uom" placeholder="UoM (bbl)" defaultValue="bbl" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="as_of" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="source" placeholder="Source (Platts/Argus/MOPS)" className="rounded-md border border-brand-gray px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal">
          Add benchmark
        </button>
      </form>
    </div>
  );
}
