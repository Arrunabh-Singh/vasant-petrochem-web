import { getApprovalRequests } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import ApprovalsTable from "@/app/components/admin/ApprovalsTable";

export default async function AdminApprovalsPage() {
  const [requests, supabase] = await Promise.all([getApprovalRequests(), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Approvals</h1>
      <p className="text-slate-500 text-sm mb-6">Maker-checker: whoever requests can&apos;t also approve — enforced in the database, not just here.</p>
      <ApprovalsTable requests={requests} currentEmail={user?.email ?? ""} />
    </div>
  );
}
