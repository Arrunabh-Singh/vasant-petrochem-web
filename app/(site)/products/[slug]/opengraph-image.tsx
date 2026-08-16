import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/products";
import { site } from "@/app/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const description = product?.description ?? "";
  const trimmed = description.length > 130 ? `${description.slice(0, 130)}…` : description;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#1a4a3a",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 6, color: "#34d399", textTransform: "uppercase", display: "flex" }}>
          {site.name}{product ? ` · ${product.code}` : ""}
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, marginTop: 20, maxWidth: 1000, lineHeight: 1.1, display: "flex" }}>
          {product?.name ?? "Product Catalog"}
        </div>
        {trimmed && (
          <div style={{ fontSize: 28, color: "#cbd5e1", marginTop: 24, maxWidth: 900, display: "flex" }}>
            {trimmed}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
