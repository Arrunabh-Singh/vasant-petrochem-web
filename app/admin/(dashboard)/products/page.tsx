import Link from "next/link";
import { getAllProductsAdmin } from "@/lib/admin";

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">Products</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">TDS</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-brand-dark">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                <td className="px-4 py-3">
                  {p.published ? (
                    <span className="text-brand-accent font-bold text-xs uppercase">Published</span>
                  ) : (
                    <span className="text-slate-400 font-bold text-xs uppercase">Hidden</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.tds_path ? "Uploaded" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="text-brand font-bold text-xs uppercase tracking-wider hover:text-brand-accent">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
