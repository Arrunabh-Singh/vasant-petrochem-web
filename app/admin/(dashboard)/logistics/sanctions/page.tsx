import { getSanctionsAdmin } from "@/lib/logistics";
import { createSanction } from "@/app/actions/shipment";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-brand-gray/60",
  clear: "bg-green-100 text-green-800",
  watch: "bg-yellow-100 text-yellow-800",
  blocked: "bg-red-100 text-red-800",
};

export default async function SanctionsPage() {
  const rows = await getSanctionsAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Sanctions Screening</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">
          OFAC / G7 price-cap / PEP screening of counterparties and vessels.
          Restricted to admin/approver.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-gray bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-gray/40 text-brand-charcoal/80">
            <tr>
              <th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">OFAC</th>
              <th className="px-3 py-2 text-left">G7 price-cap</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Screened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-charcoal/50">
                  No screenings yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-gray/20">
                <td className="px-3 py-2 font-medium">{r.party_name}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.screening_status] ?? "bg-brand-gray/60"}`}>
                    {r.screening_status}
                  </span>
                </td>
                <td className="px-3 py-2">{r.ofac_match ? "MATCH" : "clear"}</td>
                <td className="px-3 py-2">{r.g7_pricecap_ok == null ? "—" : r.g7_pricecap_ok ? "ok" : "no"}</td>
                <td className="px-3 py-2">{r.source ?? "—"}</td>
                <td className="px-3 py-2">{r.screened_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={createSanction}
        className="space-y-4 rounded-xl border border-brand-gray bg-white p-4"
      >
        <h2 className="font-semibold text-brand-dark">New screening</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required name="party_name" placeholder="Party / vessel name" className="rounded-md border border-brand-gray px-3 py-2" />
          <select name="screening_status" defaultValue="pending" className="rounded-md border border-brand-gray px-3 py-2">
            <option value="pending">pending</option>
            <option value="clear">clear</option>
            <option value="watch">watch</option>
            <option value="blocked">blocked</option>
          </select>
          <input name="source" placeholder="Source (OFAC/UN/EU)" className="rounded-md border border-brand-gray px-3 py-2" />
          <label className="flex items-center gap-2 text-sm text-brand-charcoal/80">
            <input name="ofac_match" type="checkbox" /> OFAC match
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-charcoal/80">
            <input name="g7_pricecap_ok" type="checkbox" /> G7 price-cap ok
          </label>
          <input name="notes" placeholder="Notes" className="rounded-md border border-brand-gray px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal">
          Add screening
        </button>
      </form>
    </div>
  );
}
