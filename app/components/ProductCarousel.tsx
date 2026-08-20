import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

/**
 * Phone-only swipe rail for the home page. Bleeds to the viewport edge so
 * the next card peeks, which is what tells people it scrolls.
 */
const ProductCarousel = ({ products }: { products: Product[] }) => (
    <div className="lg:hidden bleed-rail gap-3.5 pt-1.5 pb-2.5">
        {products.map((p) => (
            <div key={p.id} className="flex-none w-[82%] snap-center">
                <ProductCard product={p} />
            </div>
        ))}
    </div>
);

export default ProductCarousel;
