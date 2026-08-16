import { notFound } from "next/navigation";
import { getProductByIdAdmin, getAdminSignedTdsUrl } from "@/lib/admin";
import ProductEditForm from "@/app/components/admin/ProductEditForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductByIdAdmin(id);
  if (!product) notFound();

  const tdsUrl = product.tds_path ? await getAdminSignedTdsUrl(product.tds_path) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-6">{product.name}</h1>
      <ProductEditForm product={product} tdsUrl={tdsUrl} />
    </div>
  );
}
