import { getAllProductsAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import OffersTable, { type Offer } from "@/app/components/admin/OffersTable";

export default async function AdminOffersPage() {
  const [products, supabase] = await Promise.all([getAllProductsAdmin(), createClient()]);
  const [{ data: { user } }, { data, error }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("offers_for_review")]);
  if (error) console.error("offers_for_review failed:", error.message);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Live offers</h1>
      <p className="text-slate-500 text-sm mb-6">
        Lots on the public site&apos;s offers board. Whoever proposes a lot can&apos;t also publish it, and that is enforced in the database, not just here.
      </p>
      {error && <p className="text-amber-700 text-sm mb-6">The offers board isn&apos;t set up in the database yet (migration site_r1).</p>}
      <OffersTable offers={(data ?? []) as Offer[]} products={products.map((p) => ({ slug: p.slug, name: p.name }))} currentEmail={user?.email ?? ""} />
    </div>
  );
}
