"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { addStoreProduct, hardDeleteStoreProduct, setStoreProductActiveStatus, updateStoreProduct } from "@/lib/actions";
import {
  StoreProductCategory,
  StoreProductRow,
  STORE_PRODUCT_CATEGORIES,
} from "@/lib/types";
import { formatAmountCRC } from "@/lib/checkins";
import { cn } from "@/lib/utils";
import {
  Coffee,
  Dumbbell,
  Layers3,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fireSuccessConfetti } from "@/lib/confetti";

type ProductFormState = {
  name: string;
  category: StoreProductCategory;
  price: string;
};

function createInitialFormState(): ProductFormState {
  return {
    name: "",
    category: "Otros",
    price: "",
  };
}

function normalizeProductName(name: string) {
  return name
    .toUpperCase();
}

function getStoreErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "MISSING_STORE_PRODUCTS_TABLE") {
    return "Falta crear la tabla store_products en Supabase";
  }

  return "No se pudo guardar el producto";
}

function getCategoryAppearance(category: string) {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("bebida")) {
    return {
      icon: Coffee,
      shellClassName: "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-500/15 dark:bg-sky-500/8 dark:text-sky-200",
      badgeClassName: "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-500/15 dark:bg-sky-500/8 dark:text-sky-200",
      accentClassName: "from-sky-50/60 via-white to-white dark:from-sky-500/6 dark:via-card dark:to-card",
    };
  }

  if (normalized.includes("membre")) {
    return {
      icon: Dumbbell,
      shellClassName: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/8 dark:text-emerald-200",
      badgeClassName: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/8 dark:text-emerald-200",
      accentClassName: "from-emerald-50/60 via-white to-white dark:from-emerald-500/6 dark:via-card dark:to-card",
    };
  }

  if (normalized.includes("suple")) {
    return {
      icon: Sparkles,
      shellClassName: "border-primary/15 bg-primary/6 text-primary dark:border-primary/15 dark:bg-primary/8 dark:text-primary",
      badgeClassName: "border-primary/15 bg-primary/6 text-primary dark:border-primary/15 dark:bg-primary/8 dark:text-primary",
      accentClassName: "from-primary/5 via-white to-white dark:from-primary/6 dark:via-card dark:to-card",
    };
  }

  return {
    icon: Layers3,
    shellClassName: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/8 dark:text-amber-200",
    badgeClassName: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/8 dark:text-amber-200",
    accentClassName: "from-amber-50/60 via-white to-white dark:from-amber-500/6 dark:via-card dark:to-card",
  };
}

export function StoreProductsPage({ initialProducts }: { initialProducts: StoreProductRow[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProductRow | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(createInitialFormState());
  const [productToDelete, setProductToDelete] = useState<StoreProductRow | null>(null);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) =>
      [product.name, product.category].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [products, search]);

  const groupedProducts = useMemo(() => {
    const groups = filteredProducts.reduce<Record<string, StoreProductRow[]>>(
      (accumulator, product) => {
        const category = product.category.trim() || "Otros";
        accumulator[category] = accumulator[category]
          ? [...accumulator[category], product]
          : [product];
        return accumulator;
      },
      {}
    );

    return Object.entries(groups)
      .sort(([left], [right]) => left.localeCompare(right, "es"))
      .map(([category, categoryProducts]) => ({
        category,
        products: [...categoryProducts].sort((left, right) =>
          left.name.localeCompare(right.name, "es")
        ),
      }));
  }, [filteredProducts]);

  const activeCount = products.filter((product) => product.is_active).length;
  const activeFilteredCount = filteredProducts.filter((product) => product.is_active).length;
  const categoryCount = groupedProducts.length;

  function resetForm() {
    setFormState(createInitialFormState());
    setEditingProduct(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(product: StoreProductRow) {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      category: STORE_PRODUCT_CATEGORIES.includes(product.category as StoreProductCategory)
        ? (product.category as StoreProductCategory)
        : "Otros",
      price: String(product.price),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const name = normalizeProductName(formState.name);
    const price = Number(formState.price);

    if (!name || !Number.isFinite(price) || price <= 0) {
      toast.error("Completa nombre y precio valido");
      return;
    }

    startTransition(async () => {
      try {
        if (editingProduct) {
          await updateStoreProduct(editingProduct.id, {
            name,
            category: formState.category.trim(),
            price,
          });
          setProducts((current) =>
            current.map((product) =>
              product.id === editingProduct.id
                ? { ...product, name, category: formState.category.trim(), price }
                : product
            )
          );
          fireSuccessConfetti();
          toast.success("Producto actualizado");
        } else {
          await addStoreProduct({
            name,
            category: formState.category.trim(),
            price,
          });
          fireSuccessConfetti();
          router.refresh();
          toast.success("Producto agregado");
        }

        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch (error) {
        console.error("Failed to save store product:", error);
        toast.error(getStoreErrorMessage(error));
      }
    });
  }

  function handleToggle(product: StoreProductRow) {
    startTransition(async () => {
      try {
        await setStoreProductActiveStatus(product.id, !product.is_active);
        setProducts((current) =>
          current.map((item) =>
            item.id === product.id ? { ...item, is_active: !item.is_active } : item
          )
        );
        toast.success(product.is_active ? "Producto desactivado" : "Producto reactivado");
      } catch (error) {
        console.error("Failed to toggle store product:", error);
        toast.error(getStoreErrorMessage(error));
      }
    });
  }

  function handleHardDelete() {
    if (!productToDelete) return;

    startTransition(async () => {
      try {
        await hardDeleteStoreProduct(productToDelete.id);
        setProducts((current) =>
          current.filter((product) => product.id !== productToDelete.id)
        );
        setProductToDelete(null);
        toast.success("Producto eliminado permanentemente");
        router.refresh();
      } catch (error) {
        console.error("Failed to delete store product permanently:", error);
        toast.error(getStoreErrorMessage(error));
      }
    });
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tienda</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Catalogo global de productos y precios para usar en las compras del dashboard
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="h-9 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-primary/12 bg-linear-to-br from-primary/4 via-card to-card shadow-none dark:from-primary/5 dark:via-card dark:to-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Total productos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold text-foreground">{products.length}</CardContent>
          </Card>
          <Card className="border-emerald-200/70 bg-linear-to-br from-emerald-50/70 via-card to-card shadow-none dark:border-emerald-500/12 dark:from-emerald-500/6 dark:via-card dark:to-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Activos visibles</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{activeFilteredCount}</CardContent>
          </Card>
          <Card className="border-amber-200/70 bg-linear-to-br from-amber-50/70 via-card to-card shadow-none dark:border-amber-500/12 dark:from-amber-500/6 dark:via-card dark:to-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Categorias visibles</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold text-amber-700 dark:text-amber-200">{categoryCount}</CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-none">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o categoria..."
                className="h-9 rounded-xl border-border bg-background pl-9 text-sm shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/15 bg-primary/6 px-2.5 py-0.5 text-xs text-primary dark:border-primary/15 dark:bg-primary/8 dark:text-primary">
                {filteredProducts.length} productos
              </Badge>
              <Badge variant="outline" className="border-border bg-background px-2.5 py-0.5 text-xs text-foreground">
                {activeCount} activos totales
              </Badge>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>No hay productos</EmptyTitle>
              <EmptyDescription>
                Crea el catalogo de la tienda para reutilizar precios al registrar compras.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {groupedProducts.map(({ category, products: categoryProducts }) => {
              const appearance = getCategoryAppearance(category);
              const Icon = appearance.icon;
              const categoryActiveCount = categoryProducts.filter((product) => product.is_active).length;

              return (
                <section
                  key={category}
                  className={cn(
                    "overflow-hidden rounded-2xl border border-border bg-linear-to-br p-3 shadow-none sm:p-4",
                    appearance.accentClassName
                  )}
                >
                  <div className="mb-3 flex flex-col gap-2 border-b border-border/60 pb-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border",
                          appearance.shellClassName
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-foreground">{category}</h2>
                        <p className="text-xs text-muted-foreground">
                          {categoryProducts.length} productos en esta categoria
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs", appearance.badgeClassName)}>
                        {categoryActiveCount} activos
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background/80 px-2.5 py-0.5 text-xs text-foreground">
                        {categoryProducts.length - categoryActiveCount} inactivos
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {categoryProducts.map((product) => (
                      <Card
                        key={product.id}
                        className={cn(
                          "rounded-xl border-border bg-card/90 shadow-none transition-colors",
                          !product.is_active && "bg-muted/30"
                        )}
                      >
                        <CardContent className="space-y-3 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {normalizeProductName(product.name)}
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {formatAmountCRC(product.price)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 px-2 py-0 text-[11px]",
                                product.is_active
                                  ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/8 dark:text-emerald-200"
                                  : "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {product.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={cn("px-2 py-0 text-[11px]", appearance.badgeClassName)}>
                              {category}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              className="h-8 rounded-lg border-border bg-background px-2.5 text-xs"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggle(product)}
                              disabled={isPending}
                              className="h-8 rounded-lg border-border bg-background px-2.5 text-xs"
                            >
                              <Power className="h-3.5 w-3.5" />
                              {product.is_active ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setProductToDelete(product)}
                              disabled={isPending}
                              className="h-8 rounded-lg border-red-200/70 bg-red-50/80 px-2.5 text-xs text-red-700 hover:bg-red-100/80 hover:text-red-800 dark:border-red-500/12 dark:bg-red-500/8 dark:text-red-500 dark:hover:bg-red-500/12"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar producto" : "Agregar producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: normalizeProductName(event.target.value),
                  }))
                }
                placeholder="Ej. Creatina"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={formState.category}
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    category: value as StoreProductCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Precio (CRC)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formState.price}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, price: event.target.value }))
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setProductToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto del todo</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete
                ? `Se eliminara permanentemente "${productToDelete.name}" del catalogo. Esta accion no se puede deshacer.`
                : "Esta accion no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={isPending}
              className="bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/14"
            >
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
