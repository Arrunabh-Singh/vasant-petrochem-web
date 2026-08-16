import { getTdsRequests } from "@/lib/admin";

export default async function TdsRequestsPage() {
  const requests = await getTdsRequests();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">TDS Requests</h1>
      <p className="text-slate-500 text-sm mb-6">Everyone who exchanged an email for a spec sheet download.</p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Requested</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <a href={`mailto:${r.email}`} className="text-brand font-bold hover:underline">{r.email}</a>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.product_label || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p className="text-slate-400 text-center py-16 text-sm">No TDS requests yet.</p>
        )}
      </div>
    </div>
  );
}
