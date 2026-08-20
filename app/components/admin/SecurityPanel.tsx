"use client";

import { useState, useTransition } from "react";
import { setSystemFlag, ackAlert } from "@/app/actions/security";
import type { SecurityAlert } from "@/lib/admin";

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-slate-100 text-slate-600",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export default function SecurityPanel({
  breachMode,
  holidayMode,
  alerts,
}: {
  breachMode: boolean;
  holidayMode: boolean;
  alerts: SecurityAlert[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: "breach_mode" | "holiday_mode", current: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        await setSystemFlag(key, !current);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not change the flag.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-6 ${breachMode ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Breach-mode freeze</h2>
            <p className="text-slate-500 text-sm">{breachMode ? "ACTIVE — every admin write is blocked until this is cleared." : "Off. One switch: hide figures, freeze approvals, force re-auth, alert the family."}</p>
          </div>
          <button
            onClick={() => toggle("breach_mode", breachMode)}
            disabled={pending}
            className={`text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg disabled:opacity-60 ${breachMode ? "bg-white border border-red-300 text-red-700" : "bg-red-600 text-white"}`}
          >
            {breachMode ? "Clear freeze" : "Freeze everything"}
          </button>
        </div>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      <div className={`rounded-xl border p-6 ${holidayMode ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Holiday / read-only mode</h2>
            <p className="text-slate-500 text-sm">{holidayMode ? "ACTIVE — admin writes are paused for the shutdown window." : "Off. Use during a planned factory shutdown so nothing changes while everyone's away."}</p>
          </div>
          <button
            onClick={() => toggle("holiday_mode", holidayMode)}
            disabled={pending}
            className={`text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg disabled:opacity-60 ${holidayMode ? "bg-white border border-blue-300 text-blue-700" : "bg-brand-dark text-white"}`}
          >
            {holidayMode ? "Resume writes" : "Enable read-only"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Security alerts</h2>
        <table className="w-full text-sm">
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(a.created_at).toLocaleString("en-IN")}</td>
                <td className="py-2">
                  <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${SEVERITY_STYLES[a.severity]}`}>{a.severity}</span>
                </td>
                <td className="py-2 font-bold">{a.kind}</td>
                <td className="py-2 text-slate-500">{a.detail}</td>
                <td className="py-2 text-right">
                  {!a.acked_at && (
                    <button onClick={() => startTransition(() => ackAlert(a.id))} className="text-xs text-brand hover:underline">
                      Ack
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && <p className="text-slate-400 text-xs">No alerts.</p>}
      </div>
    </div>
  );
}
