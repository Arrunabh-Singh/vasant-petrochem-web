import { getAllShipmentsAdmin } from "@/lib/logistics";
import { createShipment } from "@/app/actions/shipment";

export default async function ShipmentsPage() {
  const rows = await getAllShipmentsAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Shipments</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">
          Road-tanker movements first. E-way expiry and ETA are watched by the
          Mac Hub logistics_watch agent.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-gray bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-gray/40 text-brand-charcoal/80">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Counterparty</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-left">E-way / ETA</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-brand-charcoal/50">
                  No shipments yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-gray/20">
                <td className="px-3 py-2 font-medium">{r.shipment_no}</td>
                <td className="px-3 py-2 uppercase">{r.mode}</td>
                <td className="px-3 py-2">{r.counterparty_name ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.origin ?? "—"} → {r.destination ?? "—"}
                </td>
                <td className="px-3 py-2">{r.product ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.qty != null ? `${r.qty} ${r.uom ?? "KL"}` : "—"}
                </td>
                <td className="px-3 py-2">{r.vehicle_no ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.eway_no ?? "—"}
                  {r.eway_expiry ? ` (exp ${r.eway_expiry})` : ""}
                  {r.eta ? ` · ETA ${r.eta}` : ""}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-brand-gray/60 px-2 py-0.5 text-xs font-medium">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={createShipment}
        className="space-y-4 rounded-xl border border-brand-gray bg-white p-4"
      >
        <h2 className="font-semibold text-brand-dark">New shipment</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required name="shipment_no" placeholder="Shipment / LR no" className="rounded-md border border-brand-gray px-3 py-2" />
          <select name="mode" defaultValue="road" className="rounded-md border border-brand-gray px-3 py-2">
            <option value="road">road</option>
            <option value="rail">rail</option>
            <option value="sea">sea</option>
            <option value="pipeline">pipeline</option>
          </select>
          <select name="status" defaultValue="booked" className="rounded-md border border-brand-gray px-3 py-2">
            <option value="booked">booked</option>
            <option value="loading">loading</option>
            <option value="in_transit">in_transit</option>
            <option value="delivered">delivered</option>
            <option value="returned">returned</option>
            <option value="disputed">disputed</option>
          </select>
          <input name="counterparty_name" placeholder="Counterparty" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="origin" placeholder="Origin" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="destination" placeholder="Destination" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="product" placeholder="Product" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="qty" type="number" step="any" placeholder="Qty" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="uom" placeholder="UOM (KL)" defaultValue="KL" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="transporter_name" placeholder="Transporter" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="vehicle_no" placeholder="Vehicle / wagon no" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="eway_no" placeholder="E-way no" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="eway_expiry" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="eta" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal">
          Add shipment
        </button>
      </form>
    </div>
  );
}
