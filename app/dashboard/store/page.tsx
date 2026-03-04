import { StoreProductsPage } from "@/components/store-products-page";
import { getStoreProducts } from "@/lib/actions";
import { StoreProductRow } from "@/lib/types";

export default async function StorePage() {
  let products: StoreProductRow[] = [];

  try {
    products = await getStoreProducts();
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.toLowerCase().includes("store_products")
    ) {
      throw error;
    }
  }

  return <StoreProductsPage initialProducts={products} />;
}
