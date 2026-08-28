import { getVehiclesAdmin } from "@/lib/logistics";
import { createVehicle } from "@/app/actions/shipment";

export default async function VehiclesPage() {
  const rows = await getVehiclesAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Fleet / Vehicles</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">
          Road tankers and their statutory renewals (insurance, fitness, PUC, permit).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-gray bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-gray/40 text-brand-charcoal/80">
            <tr>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-left">Transporter</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Cap (KL)</th>
              <th className="px-3 py-2 text-left">Insurance</th>
              <th className="px-3 py-2 text-left">Fitness</th>
              <th className="px-3 py-2 text-left">PUC</th>
              <th className="px-3 py-2 text-left">Permit</th>
              <th className="px-3 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-brand-charcoal/50">
                  No vehicles yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-gray/20">
                <td className="px-3 py-2 font-medium">{r.vehicle_no}</td>
                <td className="px-3 py-2">{r.transporter_name ?? "—"}</td>
                <td className="px-3 py-2">{r.tanker_type ?? "—"}</td>
                <td className="px-3 py-2">{r.capacity_kl != null ? r.capacity_kl : "—"}</td>
                <td className="px-3 py-2">{r.insurance_expiry ?? "—"}</td>
                <td className="px-3 py-2">{r.fitness_expiry ?? "—"}</td>
                <td className="px-3 py-2">{r.puc_expiry ?? "—"}</td>
                <td className="px-3 py-2">{r.permit_expiry ?? "—"}</td>
                <td className="px-3 py-2">{r.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={createVehicle}
        className="space-y-4 rounded-xl border border-brand-gray bg-white p-4"
      >
        <h2 className="font-semibold text-brand-dark">New vehicle</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required name="vehicle_no" placeholder="Vehicle no" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="transporter_name" placeholder="Transporter" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="tanker_type" placeholder="Tanker type (MC-407…)" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="capacity_kl" type="number" step="any" placeholder="Capacity KL" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="rto" placeholder="RTO" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="insurance_expiry" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="fitness_expiry" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="puc_expiry" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <input name="permit_expiry" type="date" className="rounded-md border border-brand-gray px-3 py-2" />
          <label className="flex items-center gap-2 text-sm text-brand-charcoal/80">
            <input name="is_active" type="checkbox" defaultChecked /> Active
          </label>
          <input name="notes" placeholder="Notes" className="rounded-md border border-brand-gray px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal">
          Add vehicle
        </button>
      </form>
    </div>
  );
}
