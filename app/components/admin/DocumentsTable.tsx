"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { uploadDocument, type DocumentFormState } from "@/app/actions/documents";
import type { DocClass, VaultDocument } from "@/lib/admin";

const DOC_CLASSES: DocClass[] = ["tds", "purchase-bills", "sales-bills", "gst", "contracts", "coa", "hr", "bank"];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  superseded: "bg-slate-200 text-slate-500",
  soft_deleted: "bg-slate-200 text-slate-500",
  legal_hold: "bg-blue-100 text-blue-700",
  quarantined: "bg-red-100 text-red-700",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const initialState: DocumentFormState = { status: "idle" };

export default function DocumentsTable({ documents }: { documents: VaultDocument[] }) {
  const [classFilter, setClassFilter] = useState<DocClass | "all">("all");
  const [state, formAction, pending] = useActionState(uploadDocument, initialState);

  const filtered = useMemo(
    () => (classFilter === "all" ? documents : documents.filter((d) => d.doc_class === classFilter)),
    [documents, classFilter]
  );

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Upload a document</h2>
        <form action={formAction} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Class</label>
            <select name="docClass" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {DOC_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input name="logicalName" required placeholder="e.g. INV-0991.pdf" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 items-end">
            <input type="file" name="file" required className="text-xs" />
            <button type="submit" disabled={pending} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-brand-dark text-white hover:bg-brand transition-colors disabled:opacity-60">
              <Upload size={14} /> {pending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
        {state.status === "error" && <p className="text-red-600 text-xs mt-2">{state.message}</p>}
        {state.status === "success" && <p className="text-brand-accent text-xs mt-2 font-bold">Uploaded.</p>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setClassFilter("all")}
          className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${classFilter === "all" ? "bg-brand text-white" : "bg-white text-slate-500 border border-slate-200"}`}
        >
          All ({documents.length})
        </button>
        {DOC_CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${classFilter === c ? "bg-brand text-white" : "bg-white text-slate-500 border border-slate-200"}`}
          >
            {c} ({documents.filter((d) => d.doc_class === c).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Retention</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-brand-dark">{d.logical_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.doc_class}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 ${STATUS_STYLES[d.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {d.legal_hold ? "legal hold" : d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatSize(d.size_bytes)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.retention_until}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/documents/${d.id}`} className="text-brand font-bold text-xs uppercase tracking-wider hover:text-brand-accent">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-slate-400 text-center py-16 text-sm">No documents in this class yet.</p>}
      </div>
    </div>
  );
}
