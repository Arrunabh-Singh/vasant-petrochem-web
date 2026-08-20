import { getAllDocuments } from "@/lib/admin";
import DocumentsTable from "@/app/components/admin/DocumentsTable";

export default async function AdminDocumentsPage() {
  const documents = await getAllDocuments();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">Documents</h1>
      <DocumentsTable documents={documents} />
    </div>
  );
}
