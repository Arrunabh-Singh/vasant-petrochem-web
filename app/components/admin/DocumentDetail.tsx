"use client";

import { useState, useTransition } from "react";
import { grantAccess, revokeAccess, setLegalHold, softDelete } from "@/app/actions/documents";
import type { DocumentAclEntry, DocEvent, DocumentVersion, VaultDocument } from "@/lib/admin";

export default function DocumentDetail({
  doc,
  versions,
  acl,
  events,
}: {
  doc: VaultDocument;
  versions: DocumentVersion[];
  acl: DocumentAclEntry[];
  events: DocEvent[];
}) {
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<"view" | "approve" | "upload">("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGrant = () => {
    setError(null);
    startTransition(async () => {
      try {
        await grantAccess(doc.id, email, level);
        setEmail("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Grant failed.");
      }
    });
  };

  const handleRevoke = (subject: string) => {
    startTransition(async () => {
      try {
        await revokeAccess(doc.id, subject);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Revoke failed.");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-brand uppercase tracking-widest">Document</h2>
          <div className="flex gap-2">
            <button
              onClick={() => startTransition(() => setLegalHold(doc.id, !doc.legal_hold))}
              disabled={pending}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand disabled:opacity-60"
            >
              {doc.legal_hold ? "Clear legal hold" : "Set legal hold"}
            </button>
            {doc.status !== "soft_deleted" && (
              <button
                onClick={() => startTransition(() => softDelete(doc.id))}
                disabled={pending}
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Soft delete
              </button>
            )}
          </div>
        </div>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-400 text-xs uppercase">Class</dt><dd className="font-mono">{doc.doc_class}</dd></div>
          <div><dt className="text-slate-400 text-xs uppercase">Status</dt><dd>{doc.status}{doc.legal_hold ? " (legal hold)" : ""}</dd></div>
          <div><dt className="text-slate-400 text-xs uppercase">Encrypted</dt><dd>{doc.encrypted ? "yes" : "no"}</dd></div>
          <div><dt className="text-slate-400 text-xs uppercase">Retention until</dt><dd>{doc.retention_until}</dd></div>
          <div><dt className="text-slate-400 text-xs uppercase">Created by</dt><dd>{doc.created_by}</dd></div>
          <div><dt className="text-slate-400 text-xs uppercase">Created</dt><dd>{new Date(doc.created_at).toLocaleString("en-IN")}</dd></div>
        </dl>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="btn-primary inline-block mt-4 text-xs px-4 py-2.5"
        >
          Download latest version
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Versions</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Version</th><th className="py-2">Checksum</th><th className="py-2">Uploaded by</th><th className="py-2">When</th></tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.version} className="border-t border-slate-100">
                <td className="py-2">v{v.version}</td>
                <td className="py-2 font-mono text-xs text-slate-400">{v.checksum_sha256.slice(0, 16)}…</td>
                <td className="py-2">{v.uploaded_by}</td>
                <td className="py-2 text-xs text-slate-500">{new Date(v.created_at).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Access</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@vasantpetrochem.com"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="view">view</option>
            <option value="approve">approve</option>
            <option value="upload">upload</option>
          </select>
          <button onClick={handleGrant} disabled={pending || !email} className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-brand-dark text-white disabled:opacity-60">
            Grant
          </button>
        </div>
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        <table className="w-full text-sm">
          <tbody>
            {acl.map((a) => (
              <tr key={a.subject_email} className="border-t border-slate-100">
                <td className="py-2">{a.subject_email}</td>
                <td className="py-2 text-slate-500">{a.level}</td>
                <td className="py-2 text-right">
                  <button onClick={() => handleRevoke(a.subject_email)} disabled={pending} className="text-xs text-red-600 hover:underline">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {acl.length === 0 && <p className="text-slate-400 text-xs">No per-document grants — visible to admin/approver only.</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-4">Event history</h2>
        <table className="w-full text-sm">
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString("en-IN")}</td>
                <td className="py-2 font-bold">{e.action}</td>
                <td className="py-2">{e.actor_email}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="text-slate-400 text-xs">No events recorded yet.</p>}
      </div>
    </div>
  );
}
