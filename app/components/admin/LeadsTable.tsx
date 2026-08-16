"use client";

import { useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { updateLeadStatus } from "@/app/actions/leads";
import type { Lead, LeadStatus } from "@/lib/admin";

const STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "won", "lost"];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-brand/10 text-brand",
  contacted: "bg-amber-100 text-amber-700",
  quoted: "bg-blue-100 text-blue-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-200 text-slate-500",
};

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function LeadsTable({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const handleStatusChange = (id: string, status: LeadStatus) => {
    const previous = leads.find((l) => l.id === id)?.status;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    startTransition(() => {
      updateLeadStatus(id, status).catch(() => {
        if (previous) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: previous } : l)));
      });
    });
  };

  const exportCsv = () => {
    const header = ["Name", "Email", "Company", "Product", "Quantity", "Message", "Status", "Received"];
    const rows = filtered.map((l) => [
      l.name,
      l.email,
      l.company ?? "",
      l.product_label ?? "",
      l.quantity ?? "",
      l.message ?? "",
      l.status,
      new Date(l.created_at).toLocaleString("en-IN"),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => toCsvValue(String(c))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vasant-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === "all" ? "bg-brand text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            All ({leads.length})
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === s ? "bg-brand text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {s} ({leads.filter((l) => l.status === s).length})
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Search name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-brand outline-none w-64"
          />
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-bold text-brand-dark">{l.name}</p>
                  <a href={`mailto:${l.email}`} className="text-brand text-xs hover:underline">{l.email}</a>
                  {l.company && <p className="text-slate-400 text-xs">{l.company}</p>}
                  {l.message && <p className="text-slate-500 text-xs mt-1 max-w-xs">{l.message}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">{l.product_label || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{l.quantity || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, e.target.value as LeadStatus)}
                    className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 border-0 outline-none cursor-pointer ${STATUS_STYLES[l.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-slate-400 text-center py-16 text-sm">No leads match this filter.</p>
        )}
      </div>
    </div>
  );
}
