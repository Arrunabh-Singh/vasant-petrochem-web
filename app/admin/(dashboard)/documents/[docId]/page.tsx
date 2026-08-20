import { notFound } from "next/navigation";
import { getDocument, getDocumentAcl, getDocumentEvents, getDocumentVersions } from "@/lib/admin";
import DocumentDetail from "@/app/components/admin/DocumentDetail";

export default async function DocumentDetailPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const doc = await getDocument(docId);
  if (!doc) notFound();

  const [versions, acl, events] = await Promise.all([
    getDocumentVersions(docId),
    getDocumentAcl(docId),
    getDocumentEvents(docId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">{doc.logical_name}</h1>
      <DocumentDetail doc={doc} versions={versions} acl={acl} events={events} />
    </div>
  );
}
