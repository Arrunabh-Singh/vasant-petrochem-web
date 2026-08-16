import { getLeads } from "@/lib/admin";
import LeadsTable from "@/app/components/admin/LeadsTable";

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">Leads</h1>
      <LeadsTable leads={leads} />
    </div>
  );
}
