import { getAppUsers, getMcpTokens, getRecentAiActions, getRecentAuditLog, getSecurityAlerts, getSystemFlags } from "@/lib/admin";
import SecurityPanel from "@/app/components/admin/SecurityPanel";
import AiTrustPanel from "@/app/components/admin/AiTrustPanel";

export default async function AdminSecurityPage() {
  const [appUsers, auditLog, alerts, flags, mcpTokens, aiActions] = await Promise.all([
    getAppUsers(),
    getRecentAuditLog(50),
    getSecurityAlerts(),
    getSystemFlags(),
    getMcpTokens(),
    getRecentAiActions(50),
  ]);
  const breachMode = flags.find((f) => f.key === "breach_mode")?.value ?? false;
  const holidayMode = flags.find((f) => f.key === "holiday_mode")?.value ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark mb-6">Security</h1>
        <SecurityPanel breachMode={breachMode} holidayMode={holidayMode} alerts={alerts} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-brand-dark mb-1">Who has access</h2>
        <p className="text-slate-500 text-sm mb-4">FEATURE_BACKLOG.md F1 — the cheapest insurance in the system. Review this every quarter.</p>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Groups</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {appUsers.map((u) => (
                <tr key={u.email} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-brand-dark">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.groups.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="text-brand-accent font-bold text-xs uppercase">Active</span>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs uppercase">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-brand-dark mb-1">AI trust</h2>
        <p className="text-slate-500 text-sm mb-4">THREAT_MODEL.md C4 — the family won&apos;t trust a single AI number without a visible source and a visible cost.</p>
        <AiTrustPanel tokens={mcpTokens} actions={aiActions} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-brand-dark mb-1">Recent activity</h2>
        <p className="text-slate-500 text-sm mb-4">Every meaningful event — document access, admin writes, AI actions, control actions.</p>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Object</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{e.actor_email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.object_type}{e.object_id ? ` · ${String(e.object_id).slice(0, 8)}…` : ""}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase ${e.outcome === "ok" ? "text-brand-accent" : "text-red-600"}`}>{e.outcome}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLog.length === 0 && <p className="text-slate-400 text-center py-16 text-sm">No activity recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
