"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fireSuccessConfetti } from "@/lib/confetti";
import { trackEvent } from "@/lib/analytics";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProductRow | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(createInitialFormState());
  const [productToDelete, setProductToDelete] = useState<StoreProductRow | null>(null);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) => {
      const matchesSearch =
        !normalized ||
        [product.name, product.category].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesCategory =
        selectedCategory === "Todas" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category.trim() || "Otros"))).sort(
        (left, right) => left.localeCompare(right, "es")
      ),
    [products]
  );

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
  const categoryCount = groupedProducts.length;

  function resetForm() {
    setFormState(createInitialFormState());
    setEditingProduct(null);
  }

  function openCreateDialog() {
    trackEvent("store_product_form_opened", {
      mode: "create",
    });
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(product: StoreProductRow) {
    trackEvent("store_product_form_opened", {
      mode: "edit",
      category: product.category,
      is_active: product.is_active,
    });
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
          trackEvent("store_product_saved", {
            mode: "edit",
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
          trackEvent("store_product_saved", {
            mode: "create",
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
        trackEvent("store_product_status_changed", {
          category: product.category,
          next_status: product.is_active ? "inactive" : "active",
        });
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
        trackEvent("store_product_deleted_permanently", {
          category: productToDelete.category,
          was_active: productToDelete.is_active,
        });
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
      <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-primary/10 via-transparent to-transparent px-5 py-7 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-[12%] h-px w-2/3 bg-linear-to-r from-transparent via-primary/45 to-transparent" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                Catálogo
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Tienda</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Productos y precios disponibles para registrar ventas.
              </p>
            </div>
            <Button
              onClick={openCreateDialog}
              className="h-10 rounded-full bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o categoria..."
                className="h-11 rounded-full border-border bg-muted/35 pl-10 pr-9 text-sm shadow-none focus-visible:bg-background"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <span><strong className="font-semibold text-foreground">{products.length}</strong> productos</span>
              <span className="h-3 w-px bg-border" />
              <span><strong className="font-semibold text-foreground">{activeCount}</strong> activos</span>
              <span className="h-3 w-px bg-border" />
              <span><strong className="font-semibold text-foreground">{categoryCount}</strong> categorías</span>
            </div>
          </div>
          {categories.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-border pb-3">
              {["Todas", ...categories].map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "h-8 shrink-0 rounded-full px-3 text-xs",
                    selectedCategory === category
                      ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
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
                <section key={category}>
                  <div className="mb-4 flex items-center justify-between">
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
                        <h2 className="text-base font-semibold tracking-tight text-foreground">{category}</h2>
                        <p className="text-xs text-muted-foreground">{categoryProducts.length} productos</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{categoryActiveCount}</span> disponibles</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {categoryProducts.map((product) => (
                        <Card
                          key={product.id}
                          className={cn(
                          "group relative overflow-hidden rounded-2xl border-border bg-card shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10",
                          !product.is_active && "opacity-65"
                        )}
                      >
                        <div className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100", appearance.shellClassName)} />
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", appearance.shellClassName)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {normalizeProductName(product.name)}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{category}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 px-2 py-0 text-[11px]",
                                product.is_active
                                  ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 shadow-[0_0_0_3px_rgb(34_197_94_/_0.08)] dark:border-emerald-500/15 dark:bg-emerald-500/8 dark:text-emerald-200"
                                  : "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {product.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>

                          <div className="flex items-end justify-between border-t border-border/70 pt-3">
                            <p className="text-xl font-semibold tracking-tight text-foreground">
                              {formatAmountCRC(product.price)}
                            </p>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">CRC</p>
                          </div>

                          <div className="flex items-center gap-1 border-t border-border/70 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              className="h-8 flex-1 rounded-lg border-border bg-background px-2.5 text-xs"
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
                              className="h-8 w-8 rounded-lg border-0 bg-transparent p-0 text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              aria-label={`Eliminar ${product.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
