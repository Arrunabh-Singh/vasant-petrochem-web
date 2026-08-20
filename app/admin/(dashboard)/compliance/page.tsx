import { getComplianceDue } from "@/lib/admin";
import ComplianceTable from "@/app/components/admin/ComplianceTable";

export default async function AdminCompliancePage() {
  const items = await getComplianceDue();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Compliance Cockpit</h1>
      <p className="text-slate-500 text-sm mb-6">Licences, insurance, contracts, e-way bills — sorted by days to expiry. A lapse here can mean a plant shutdown.</p>
      <ComplianceTable items={items} />
    </div>
  );
}
