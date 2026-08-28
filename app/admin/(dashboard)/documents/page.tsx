import { getAllDocuments } from "@/lib/admin";
import DocumentsTable from "@/app/components/admin/DocumentsTable";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const documents = await getAllDocuments(q);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">Documents</h1>
      <DocumentsTable documents={documents} q={q ?? ""} />
    </div>
  );
}
