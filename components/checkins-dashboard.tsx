"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  Droplets,
  Dumbbell,
  LogIn,
  Trash2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trophy,
  User,
  UserRoundCheck,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckIn,
  CheckInInput,
  buildCheckInDateTime,
  formatAmountCRC,
  formatLocalDateKey,
  formatSelectedDate,
  getMonthlyAttendanceRanking,
} from "@/lib/checkins";
import { addCheckIn, addStoreProduct, deleteCheckIn, updateCheckIn } from "@/lib/actions";
import {
  MemberWithStatus,
  StoreProductRow,
  disciplineLabels,
} from "@/lib/types";
import { formatPersonName, getFirstNameAndSurnameKey } from "@/lib/member-utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fireSuccessConfetti } from "@/lib/confetti";

interface CheckInsDashboardProps {
  initialCheckIns: CheckIn[];
  initialProducts: StoreProductRow[];
  initialMembers: MemberWithStatus[];
  initialDateKey: string;
  initialTime: string;
}

type PaymentMethodValue = "TARJETA" | "EFECTIVO" | "SINPE" | "NONE";

type CheckInFormState = {
  name: string;
  time: string;
  hasPurchase: boolean;
  product: string;
  paymentMethod: PaymentMethodValue;
  amount: string;
  notes: string;
};

type PriceItem = {
  id?: string;
  name: string;
  price: string;
};

type PriceCategory = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: PriceItem[];
};

function getCheckInActionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "MISSING_CHECK_INS_TABLE") {
    return "Falta crear la tabla check_ins en Supabase";
  }
  return "No se pudo completar la accion";
}

function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word.length > 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word
    )
    .join(" ");
}

function createInitialFormState(initialTime: string): CheckInFormState {
  return {
    name: "",
    time: initialTime,
    hasPurchase: false,
    product: "",
    paymentMethod: "NONE",
    amount: "",
    notes: "",
  };
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow]",
        tone === "success"
          ? "border-0 border-transparent bg-primary text-primary-foreground hover:bg-primary"
          : "border border-border bg-background text-foreground hover:bg-background"
      )}
    >
      {children}
    </span>
  );
}

function getMemberStatusClasses(status: MemberWithStatus["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800 font-semibold";
    case "expiring":
      return "bg-amber-100 text-amber-800 font-semibold";
    case "expired":
      return "bg-red-100 text-red-800 font-semibold";
    case "inactive":
      return "bg-sky-100 text-sky-800 font-semibold";
  }
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

function shiftDateKey(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + amount);
  return formatLocalDateKey(date);
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function encodeProductSelectValue(product: StoreProductRow) {
  return `${product.id}::${product.name}`;
}

function decodeProductNameFromSelectValue(value: string) {
  const separatorIndex = value.indexOf("::");
  return separatorIndex >= 0 ? value.slice(separatorIndex + 2) : value;
}

function getSelectValueForProductName(
  products: StoreProductRow[],
  productName: string
) {
  const match = products.find((product) => product.name === productName);
  return match ? encodeProductSelectValue(match) : undefined;
}

// ─── FIX: step titles now correctly reflect the dynamic flow ───────────────
function getMobileStepTitle(step: number, hasPurchase: boolean) {
  if (step === 1) return "Datos";
  if (hasPurchase) {
    if (step === 2) return "Compra";
    return "Notas";
  }
  // without purchase: step 2 is always Notes
  return "Notas";
}

export function CheckInsDashboard({
  initialCheckIns,
  initialProducts,
  initialMembers,
  initialDateKey,
  initialTime,
}: CheckInsDashboardProps) {
  const router = useRouter();
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [products, setProducts] = useState(initialProducts);
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState(initialDateKey);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formState, setFormState] = useState<CheckInFormState>(
    createInitialFormState(initialTime)
  );
  const [isPriceSheetOpen, setIsPriceSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<CheckInFormState | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [quickProductName, setQuickProductName] = useState("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // ─── FIX: totalMobileSteps is now dynamic based on hasPurchase ────────────
  const totalMobileSteps = formState.hasPurchase ? 3 : 2;

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products]
  );

  const groupedProducts = useMemo(() => {
    return activeProducts.reduce<Record<string, StoreProductRow[]>>((groups, product) => {
      const key = product.category.trim() || "Otros";
      groups[key] = groups[key] ? [...groups[key], product] : [product];
      return groups;
    }, {});
  }, [activeProducts]);

  // ─── FIX: clamp mobileStep when totalMobileSteps shrinks ─────────────────
  useEffect(() => {
    setMobileStep((current) => Math.min(current, totalMobileSteps));
  }, [totalMobileSteps]);

  const matchedMember = useMemo(() => {
    const normalizedName = formatPersonName(formState.name);
    if (!normalizedName.trim()) return null;

    const directMatch = initialMembers.find(
      (member) => formatPersonName(member.name) === normalizedName
    );
    if (directMatch) return directMatch;

    const key = getFirstNameAndSurnameKey(normalizedName);
    if (!key) return null;

    return (
      initialMembers.find(
        (member) => getFirstNameAndSurnameKey(member.name) === key
      ) ?? null
    );
  }, [formState.name, initialMembers]);

  const memberNameSuggestions = useMemo(() => {
    const normalizedQuery = formatPersonName(formState.name).toLowerCase();
    const names = Array.from(
      new Set(
        initialMembers
          .map((member) => formatPersonName(member.name))
          .filter((name) => name.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, "es-CR"));

    if (!normalizedQuery) return names.slice(0, 8);

    const startsWithMatches = names.filter((name) =>
      name.toLowerCase().startsWith(normalizedQuery)
    );
    const containsMatches = names.filter(
      (name) =>
        !name.toLowerCase().startsWith(normalizedQuery) &&
        name.toLowerCase().includes(normalizedQuery)
    );

    return [...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [formState.name, initialMembers]);

  const shouldShowNameSuggestions =
    showNameSuggestions &&
    formatPersonName(formState.name).length > 0 &&
    memberNameSuggestions.length > 0;

  const membersByNameKey = useMemo(() => {
    const entries = new Map<string, MemberWithStatus>();

    for (const member of initialMembers) {
      const normalizedFullName = formatPersonName(member.name);
      if (normalizedFullName) {
        entries.set(normalizedFullName, member);
      }

      const key = getFirstNameAndSurnameKey(member.name);
      if (key && !entries.has(key)) {
        entries.set(key, member);
      }
    }

    return entries;
  }, [initialMembers]);

  function getMatchedMemberForName(name: string) {
    const normalizedName = formatPersonName(name);
    if (!normalizedName) return null;

    return (
      membersByNameKey.get(normalizedName) ??
      membersByNameKey.get(getFirstNameAndSurnameKey(normalizedName)) ??
      null
    );
  }

  const selectedProductsTotal = useMemo(
    () =>
      selectedProducts.reduce((sum, productName) => {
        const product = getProductByName(productName);
        return sum + (product?.price ?? 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProducts, activeProducts]
  );

  function getProductByName(name: string) {
    return activeProducts.find((product) => product.name === name);
  }

  function syncSelectedProducts(nextProducts: string[]) {
    setSelectedProducts(nextProducts);
    setFormState((current) => ({
      ...current,
      product: nextProducts.join(", "),
      amount: String(
        nextProducts.reduce(
          (sum, productName) => sum + (getProductByName(productName)?.price ?? 0),
          0
        )
      ),
    }));
  }

  function addSelectedProduct(name: string) {
    const productName = decodeProductNameFromSelectValue(name);
    if (!productName || selectedProducts.includes(productName)) return;
    syncSelectedProducts([...selectedProducts, productName]);
  }

  function removeSelectedProduct(name: string) {
    const nextProducts = selectedProducts.filter((product) => product !== name);
    syncSelectedProducts(nextProducts);
  }

  function toPayload(state: CheckInFormState, date: string): CheckInInput {
    const amountValue = state.hasPurchase ? Number(state.amount || "0") : 0;

    return {
      name: state.name.trim(),
      date,
      time: state.time.trim(),
      hasPurchase: state.hasPurchase,
      product: state.hasPurchase ? state.product.trim() || undefined : undefined,
      paymentMethod:
        state.hasPurchase && state.paymentMethod !== "NONE"
          ? state.paymentMethod
          : undefined,
      amount:
        state.hasPurchase && Number.isFinite(amountValue) && amountValue > 0
          ? amountValue
          : undefined,
      notes: state.notes.trim() || undefined,
    };
  }

  const dayCheckIns = useMemo(() => {
    return checkIns
      .filter((checkIn) => formatLocalDateKey(checkIn.datetime) === selectedDate)
      .sort(
        (left, right) =>
          new Date(left.datetime).getTime() - new Date(right.datetime).getTime()
      );
  }, [checkIns, selectedDate]);

  const filteredCheckIns = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return dayCheckIns;

    return dayCheckIns.filter((checkIn) =>
      checkIn.name.toLowerCase().includes(normalized)
    );
  }, [dayCheckIns, searchTerm]);

  const weeklySearchSummary = useMemo(() => {
    const normalizedSearch = formatPersonName(searchTerm);
    if (!normalizedSearch) return null;

    const anchorDate = new Date(`${selectedDate}T00:00:00`);
    const weekStart = getStartOfWeek(anchorDate);
    const weekEnd = getEndOfWeek(anchorDate);

    const matchingWeekCheckIns = checkIns.filter((checkIn) => {
      const normalizedName = formatPersonName(checkIn.name);
      const checkInDate = new Date(checkIn.datetime);

      return (
        normalizedName.includes(normalizedSearch) &&
        checkInDate >= weekStart &&
        checkInDate <= weekEnd
      );
    });

    if (matchingWeekCheckIns.length === 0) return null;

    const groupedByDay = new Map<string, Date>();
    for (const checkIn of matchingWeekCheckIns) {
      const date = new Date(checkIn.datetime);
      const key = formatLocalDateKey(date);
      if (!groupedByDay.has(key)) {
        groupedByDay.set(key, date);
      }
    }

    const visitedDays = Array.from(groupedByDay.values()).sort(
      (left, right) => left.getTime() - right.getTime()
    );

    const exactNameMatch =
      matchingWeekCheckIns.find(
        (checkIn) => formatPersonName(checkIn.name) === normalizedSearch
      )?.name ?? matchingWeekCheckIns[0]?.name ?? searchTerm.trim();

    return {
      name: exactNameMatch,
      count: visitedDays.length,
      days: visitedDays.map(formatWeekdayLabel),
    };
  }, [checkIns, searchTerm, selectedDate]);

  const metrics = useMemo(() => {
    const sales = dayCheckIns.filter((checkIn) => checkIn.hasPurchase);
    const totalSold = sales.reduce(
      (sum, checkIn) => sum + (checkIn.amount ?? 0),
      0
    );

    return {
      visits: dayCheckIns.length,
      sales: sales.length,
      totalSold,
    };
  }, [dayCheckIns]);

  const monthlyRanking = useMemo(() => {
    return getMonthlyAttendanceRanking(checkIns, selectedDate, 5);
  }, [checkIns, selectedDate]);

  const topNames = monthlyRanking.map((entry) => entry.name).join(", ");

  function updateForm<K extends keyof CheckInFormState>(
    key: K,
    value: CheckInFormState[K]
  ) {
    if (key === "hasPurchase") {
      const hasPurchase = Boolean(value);
      setPaymentError(false);
      if (!hasPurchase) {
        setSelectedProducts([]);
        setFormState((current) => ({
          ...current,
          hasPurchase,
          product: "",
          paymentMethod: "NONE",
          amount: "",
        }));
        return;
      }

      setFormState((current) => ({ ...current, hasPurchase }));
      return;
    }

    setFormState((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setFormState(createInitialFormState(initialTime));
    setSelectedProducts([]);
    setQuickProductName("");
    setPaymentError(false);
    setMobileStep(1);
    setShowNameSuggestions(false);
  }

  function handleQuickCreateProduct() {
    const name = quickProductName.trim();
    if (!name) return;

    setIsCreatingProduct(true);
    startTransition(async () => {
      try {
        const createdProduct = await addStoreProduct({
          name,
          category: "Otros",
          price: 0,
        });

        setProducts((current) => [...current, createdProduct]);
        addSelectedProduct(name);
        setQuickProductName("");
        fireSuccessConfetti();
        toast.success("Producto creado");
        router.refresh();
      } catch (error) {
        console.error("Failed to create store product:", error);
        toast.error("No se pudo crear el producto");
      } finally {
        setIsCreatingProduct(false);
      }
    });
  }

  // ─── FIX: handleMobileNext now handles save when on last step ────────────
  function handleMobileNext() {
    if (mobileStep === 1 && !formState.name.trim()) return;

    if (formState.hasPurchase && mobileStep === 2) {
      if (selectedProducts.length === 0) {
        toast.error("Selecciona al menos un producto");
        return;
      }
      if (formState.paymentMethod === "NONE") {
        setPaymentError(true);
        return;
      }
    }

    // If already on last step, submit the form
    if (mobileStep >= totalMobileSteps) {
      handleAddPerson();
      return;
    }

    setMobileStep((current) => Math.min(current + 1, totalMobileSteps));
  }

  function handleMobileBack() {
    setMobileStep((current) => Math.max(current - 1, 1));
  }

  function startEditing(checkIn: CheckIn) {
    setEditingId(checkIn.id);
    setConfirmingDelete(false);
    setEditingState({
      name: checkIn.name,
      time: checkIn.time,
      hasPurchase: checkIn.hasPurchase,
      product: checkIn.product ?? "",
      paymentMethod: checkIn.paymentMethod ?? "NONE",
      amount: checkIn.amount ? String(checkIn.amount) : "",
      notes: checkIn.notes ?? "",
    });
  }

  function updateEditing<K extends keyof CheckInFormState>(
    key: K,
    value: CheckInFormState[K]
  ) {
    if (key === "product") {
      const productName = decodeProductNameFromSelectValue(String(value));
      const selectedProduct = getProductByName(productName);
      setEditingState((current) =>
        current
          ? {
            ...current,
            product: productName,
            amount: selectedProduct ? String(selectedProduct.price) : "",
          }
          : current
      );
      return;
    }

    setEditingState((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingState(null);
    setConfirmingDelete(false);
  }

  function saveEditing() {
    if (!editingId || !editingState) return;
    const name = editingState.name.trim();
    const time = editingState.time.trim();
    if (!name || !time) return;
    if (editingState.hasPurchase && !editingState.product.trim()) {
      toast.error("Selecciona un producto de la tienda");
      return;
    }

    const original = checkIns.find((item) => item.id === editingId);
    if (!original) return;

    startTransition(async () => {
      try {
        const amountValue = editingState.hasPurchase
          ? Number(editingState.amount || "0")
          : 0;

        await updateCheckIn(
          editingId,
          toPayload(editingState, formatLocalDateKey(original.datetime))
        );

        setCheckIns((current) =>
          current.map((checkIn) => {
            if (checkIn.id !== editingId) return checkIn;
            const datetime = buildCheckInDateTime(
              formatLocalDateKey(original.datetime),
              time
            );
            return {
              ...checkIn,
              name,
              time,
              datetime: datetime.toISOString(),
              hasPurchase: editingState.hasPurchase,
              product: editingState.hasPurchase
                ? editingState.product.trim() || undefined
                : undefined,
              paymentMethod:
                editingState.hasPurchase && editingState.paymentMethod !== "NONE"
                  ? editingState.paymentMethod
                  : undefined,
              amount:
                editingState.hasPurchase &&
                  Number.isFinite(amountValue) &&
                  amountValue > 0
                  ? amountValue
                  : undefined,
              notes: editingState.notes.trim() || undefined,
            };
          })
        );

        cancelEditing();
        fireSuccessConfetti();
        router.refresh();
      } catch (error) {
        console.error("Failed to update check-in:", error);
        toast.error(getCheckInActionErrorMessage(error));
      }
    });
  }

  function handleDeleteCheckIn(id: string) {
    startTransition(async () => {
      try {
        await deleteCheckIn(id);
        setCheckIns((current) => current.filter((checkIn) => checkIn.id !== id));
        if (editingId === id) {
          cancelEditing();
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to delete check-in:", error);
        toast.error(getCheckInActionErrorMessage(error));
      }
    });
  }

  function handleAddPerson() {
    const name = capitalizeWords(formState.name.trim());
    const time = formState.time.trim();

    if (!name || !time) return;
    if (formState.hasPurchase && selectedProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    if (formState.hasPurchase && formState.paymentMethod === "NONE") {
      setPaymentError(true);
      return;
    }

    startTransition(async () => {
      try {
        const payload = toPayload(
          {
            ...formState,
            name,
            product: selectedProducts.join(", "),
            amount: String(selectedProductsTotal),
          },
          selectedDate
        );
        const createdCheckIn = await addCheckIn(payload);
        setCheckIns((current) => [...current, createdCheckIn]);
        setIsAddOpen(false);
        resetForm();
        fireSuccessConfetti();
        router.refresh();
      } catch (error) {
        console.error("Failed to add check-in:", error);
        toast.error(getCheckInActionErrorMessage(error));
      }
    });
  }

  const metricCards = [
    {
      title: "Visitas hoy",
      value: metrics.visits.toString(),
      icon: UserRoundCheck,
      iconShellClassName: "bg-primary/10",
      iconClassName: "text-primary",
    },
    {
      title: "Ventas hoy",
      value: metrics.sales.toString(),
      icon: ShoppingBag,
      iconShellClassName: "bg-chart-4/10",
      iconClassName: "text-chart-4",
    },
    {
      title: "Total vendido",
      value: formatAmountCRC(metrics.totalSold),
      icon: Wallet,
      iconShellClassName: "bg-primary/10",
      iconClassName: "text-primary",
    },
    {
      title: `Mas asistencias mes (${monthlyRanking.length})`,
      value: topNames ? `Empate: ${topNames}` : "Empate: -",
      icon: Trophy,
      iconShellClassName: "bg-primary/10",
      iconClassName: "text-primary",
      compact: true,
    },
  ];

  const priceCategoriesFromStore: PriceCategory[] = Object.entries(groupedProducts).map(
    ([title, categoryProducts]) => ({
      title,
      icon:
        title.toLowerCase().includes("bebida")
          ? Droplets
          : title.toLowerCase().includes("membre")
            ? Dumbbell
            : Package,
      items: categoryProducts.map((product) => ({
        id: product.id,
        name: product.name,
        price: formatAmountCRC(product.price),
      })),
    })
  );

  const showInitialEmptyState = filteredCheckIns.length === 0 && !searchTerm.trim();

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <Sheet open={isPriceSheetOpen} onOpenChange={setIsPriceSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-border bg-card sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="text-xl">Lista de Precios</SheetTitle>
            <SheetDescription>
              Precios actuales de productos y servicios
            </SheetDescription>
          </SheetHeader>

          <div className="m-2.5 flex flex-col gap-6">
            {priceCategoriesFromStore.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay productos en tienda. Ve a la ruta Tienda para agregarlos.
              </div>
            ) : (
              priceCategoriesFromStore.map((category) => (
                <div key={category.title}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <category.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {category.title}
                    </h3>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {category.items.map((item, index) => (
                      <div
                        key={item.id ?? `${category.title}-${item.name}-${index}`}
                        className={cn(
                          "flex items-center justify-between px-4 py-3",
                          index !== category.items.length - 1 && "border-b border-border"
                        )}
                      >
                        <span className="w-full text-sm text-foreground">{item.name}</span>
                        <span className="text-sm font-semibold text-primary">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="mb-6 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Administrar tienda
                  </h3>
                </div>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/store")}>
                  Ir a tienda
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add Check-in Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agregar persona</DialogTitle>
            <DialogDescription>
              Registra una nueva entrada al gimnasio
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Paso {mobileStep} de {totalMobileSteps}
              </span>
              <span>{formState.hasPurchase ? "Entrada con compra" : "Entrada simple"}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {getMobileStepTitle(mobileStep, formState.hasPurchase)}
              </p>
              <p className="text-xs text-muted-foreground">
                {mobileStep === 1
                  ? "Completa los datos base del check-in."
                  : mobileStep === 2 && formState.hasPurchase
                    ? "Agrega productos y define el metodo de pago."
                    : "Agrega notas opcionales antes de guardar."}
              </p>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalMobileSteps}, 1fr)` }}>
              {Array.from({ length: totalMobileSteps }, (_, index) => {
                const step = index + 1;
                return (
                  <div
                    key={step}
                    className={cn(
                      "h-2 rounded-full transition-colors",
                      step <= mobileStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Step 1: Datos ──────────────────────────────────────────────── */}
          <div className={cn("space-y-4", mobileStep === 1 ? "block" : "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="checkin-name">Nombre *</Label>
              <div className="relative">
                <Input
                  id="checkin-name"
                  value={formState.name}
                  onChange={(event) => {
                    updateForm("name", event.target.value);
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowNameSuggestions(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setShowNameSuggestions(false);
                    }
                    if (event.key === "Enter" && shouldShowNameSuggestions) {
                      event.preventDefault();
                      const firstSuggestion = memberNameSuggestions[0];
                      if (firstSuggestion) {
                        updateForm("name", firstSuggestion);
                        setShowNameSuggestions(false);
                      }
                    }
                  }}
                  placeholder="Nombre de la persona"
                  autoComplete="off"
                  required
                  className="bg-background border-border"
                />
                {shouldShowNameSuggestions ? (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background shadow-md">
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {memberNameSuggestions.map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              updateForm("name", name);
                              setShowNameSuggestions(false);
                            }}
                          >
                            {name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {matchedMember ? (
                <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("capitalize", getMemberStatusClasses(matchedMember.status))}
                    >
                      {matchedMember.status}
                    </Badge>
                    <Badge variant="outline" className="border-border">
                      Left {matchedMember.days_remaining} dias
                    </Badge>
                    <Badge variant="outline" className="border-border">
                      {disciplineLabels[matchedMember.discipline]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coincide con miembro: {matchedMember.name}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>¿Realizó una compra?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateForm("hasPurchase", false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
                    !formState.hasPurchase
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  <User className="h-6 w-6" />
                  <span className="font-medium">Solo entrada</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateForm("hasPurchase", true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
                    formState.hasPurchase
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  <ShoppingBag className="h-6 w-6" />
                  <span className="font-medium">Con compra</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Step 2 (with purchase): Compra ─────────────────────────────── */}
          {formState.hasPurchase && (
            <div className={cn("space-y-3", mobileStep === 2 ? "block" : "hidden")}>
              <div className="space-y-2">
                <Label htmlFor="checkin-product">Productos</Label>
                <div className="min-h-[46px] rounded-2xl border border-border bg-background px-3 py-2">
                  {selectedProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProducts.map((productName) => (
                        <Badge
                          key={productName}
                          variant="secondary"
                          className="rounded-full border border-lime-200 bg-lime-100 px-3 py-1 text-lime-700"
                        >
                          <span>{productName}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedProduct(productName)}
                            className="ml-1 rounded-full text-lime-700/80 transition hover:bg-accent hover:text-lime-900 dark:text-lime-300/90 dark:hover:text-lime-200"
                            aria-label={`Quitar ${productName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No hay productos agregados
                    </span>
                  )}
                </div>
                <Select value={undefined} onValueChange={addSelectedProduct}>
                  <SelectTrigger id="checkin-product" className="h-11 w-fit min-w-[192px] rounded-xl border-border bg-background shadow-none">
                    <SelectValue placeholder="Agregar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((product) => (
                      <SelectItem key={product.id} value={encodeProductSelectValue(product)}>
                        {product.name} · {formatAmountCRC(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      value={quickProductName}
                      onChange={(event) => setQuickProductName(event.target.value)}
                      placeholder="Nuevo producto"
                      className="h-11 rounded-xl border-border bg-background shadow-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl px-5 shadow-none"
                      onClick={handleQuickCreateProduct}
                      disabled={isCreatingProduct || !quickProductName.trim()}
                    >
                      Crear
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Se guarda en la base de datos y puedes ajustar el precio en la lista.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkin-payment">Método de Pago *</Label>
                <Select
                  value={formState.paymentMethod}
                  onValueChange={(value) => {
                    setPaymentError(false);
                    updateForm("paymentMethod", value as PaymentMethodValue);
                  }}
                >
                  <SelectTrigger
                    id="checkin-payment"
                    className={cn(
                      "h-11 w-fit min-w-[182px] rounded-xl bg-background shadow-none",
                      paymentError ? "border-destructive" : "border-border"
                    )}
                  >
                    <SelectValue placeholder="Seleccionar metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TARJETA">TARJETA</SelectItem>
                    <SelectItem value="EFECTIVO">EFECTIVO</SelectItem>
                    <SelectItem value="SINPE">SINPE</SelectItem>
                  </SelectContent>
                </Select>
                {paymentError ? (
                  <p className="text-xs text-destructive">
                    Selecciona un metodo de pago.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* ── Step: Notas (last step always) ─────────────────────────────── */}
          {/* 
            FIX: This step is shown when:
            - hasPurchase=true  AND mobileStep=3  (last step)
            - hasPurchase=false AND mobileStep=2  (last step)
            In both cases mobileStep === totalMobileSteps covers it.
          */}
          <div className={cn("space-y-2", mobileStep === totalMobileSteps ? "block" : "hidden")}>
            <Label htmlFor="checkin-notes">Notas (opcional)</Label>
            <Textarea
              id="checkin-notes"
              value={formState.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
              className="resize-none rounded-2xl border-border bg-background shadow-none"
            />
          </div>

          {/* ── Dialog action buttons ───────────────────────────────────────── */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={
                mobileStep === 1
                  ? () => {
                    setIsAddOpen(false);
                    resetForm();
                  }
                  : handleMobileBack
              }
            >
              {mobileStep === 1 ? "Cancelar" : "Atrás"}
            </Button>

            {/* ── FIX: single button handles both Next and Save ── */}
            <Button
              type="button"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={
                isPending ||
                (mobileStep === 1 && !formState.name.trim()) ||
                !formState.time.trim()
              }
              onClick={handleMobileNext}
            >
              {mobileStep >= totalMobileSteps ? "Guardar" : "Siguiente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            className="h-10 w-full rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Agregar persona
          </Button>
          {!showInitialEmptyState ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-2xl border-border bg-background text-foreground sm:w-auto"
              onClick={() => setIsPriceSheetOpen(true)}
            >
              Ver precios actuales
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-10 w-full items-center gap-1 rounded-2xl border border-border/70 bg-card/85 px-2 shadow-sm backdrop-blur sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setSelectedDate((current) => shiftDateKey(current, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-w-0 flex-1 rounded-xl px-3 text-center hover:bg-accent/60 sm:min-w-[220px] sm:flex-none"
                >
                  <div className="flex w-full items-center justify-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {formatSelectedDate(selectedDate)}
                    </span>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                className="w-[min(92vw,300px)] rounded-[1.25rem] border-border/70 bg-card/95 p-2.5 shadow-xl backdrop-blur"
              >
                <Calendar
                  mode="single"
                  selected={dateKeyToDate(selectedDate)}
                  onSelect={(date) => {
                    if (!date) return;
                    setSelectedDate(formatLocalDateKey(date));
                    setCalendarOpen(false);
                  }}
                  className="mx-auto rounded-xl text-sm [--cell-size:2rem]"
                  classNames={{
                    month: "flex flex-col w-full gap-2.5",
                    month_caption: "flex items-center justify-center h-8 w-full px-8",
                    caption_label: "text-sm font-semibold",
                    nav: "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
                    button_previous:
                      "size-8 rounded-full border border-transparent hover:border-border hover:bg-accent/50",
                    button_next:
                      "size-8 rounded-full border border-transparent hover:border-border hover:bg-accent/50",
                    weekdays: "mt-0.5 flex",
                    weekday:
                      "text-muted-foreground rounded-md flex-1 text-[11px] font-medium uppercase tracking-[0.08em]",
                    week: "mt-0.5 flex w-full",
                  }}
                />
                <div className="mt-2.5 flex gap-2 border-t border-border/70 pt-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 flex-1 rounded-xl"
                    onClick={() => {
                      setSelectedDate(initialDateKey);
                      setCalendarOpen(false);
                    }}
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 flex-1 rounded-xl"
                    onClick={() => {
                      setSelectedDate(shiftDateKey(initialDateKey, -1));
                      setCalendarOpen(false);
                    }}
                  >
                    Ayer
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setSelectedDate((current) => shiftDateKey(current, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-2xl border-border bg-background text-foreground sm:w-auto"
            onClick={() => setSelectedDate(initialDateKey)}
          >
            Ir a hoy
          </Button>
        </div>
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.title}
            className="flex min-h-[80px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:min-h-[88px] sm:gap-4"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10",
                card.iconShellClassName
              )}
            >
              <card.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", card.iconClassName)} />
            </div>
            <div className={cn(card.compact && "min-w-0")}>
              <p
                className={cn(
                  "font-bold text-foreground",
                  card.compact
                    ? "truncate text-sm font-semibold"
                    : "text-xl sm:text-2xl"
                )}
              >
                {card.value}
              </p>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por nombre..."
          className="h-10 rounded-[14px] border-border bg-background pl-11 text-base text-foreground shadow-none placeholder:text-muted-foreground"
        />
      </div>
      {weeklySearchSummary ? (
        <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {weeklySearchSummary.count} dias esta semana
            </Badge>
            <p className="text-sm font-medium text-foreground">
              {weeklySearchSummary.name}
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Dias registrados: {weeklySearchSummary.days.join(", ")}
          </p>
        </div>
      ) : null}

      {/* ── Table / empty state ─────────────────────────────────────────────── */}
      {showInitialEmptyState ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-24 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
              <Clock3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="font-medium text-foreground">No hay registros para este dia</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Haz clic en &quot;Agregar persona&quot; para comenzar
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-10 w-[80px] px-2 font-medium text-muted-foreground">Hora</TableHead>
                  <TableHead className="h-10 px-2 font-medium text-muted-foreground">Nombre</TableHead>
                  <TableHead className="h-10 w-[100px] px-2 font-medium text-muted-foreground">Compra</TableHead>
                  <TableHead className="h-10 px-2 font-medium text-muted-foreground">Producto</TableHead>
                  <TableHead className="h-10 px-2 font-medium text-muted-foreground">Pago</TableHead>
                  <TableHead className="h-10 px-2 font-medium text-muted-foreground">Notas</TableHead>
                  <TableHead className="h-10 w-[80px] px-2 font-medium text-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheckIns.length === 0 ? (
                  <TableRow className="border-border transition-colors hover:bg-secondary/20">
                    <TableCell colSpan={7} className="p-2 text-center text-sm text-muted-foreground">
                      No hay check-ins para la fecha o filtro seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCheckIns.map((checkIn) => {
                    const isEditing = editingId === checkIn.id && editingState;
                    const relatedMember = getMatchedMemberForName(checkIn.name);

                    if (isEditing && confirmingDelete) {
                      return (
                        <TableRow key={checkIn.id} className="border-border bg-destructive/10">
                          <TableCell colSpan={6} className="py-4 text-center">
                            <span className="text-sm text-foreground">
                              Eliminar a <strong>{checkIn.name}</strong>?
                            </span>
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCheckIn(checkIn.id)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmingDelete(false)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={checkIn.id} className={cn(
                        "border-border transition-colors hover:bg-secondary/20",
                        isEditing && "bg-secondary/30"
                      )}>
                        <TableCell className="p-2 font-mono text-sm text-muted-foreground">
                          {isEditing ? (
                            <Input
                              type="time"
                              value={editingState.time}
                              onChange={(event) => updateEditing("time", event.target.value)}
                              className="h-8 w-[88px] rounded-md border-border bg-background px-2 py-1 text-sm shadow-none"
                            />
                          ) : (
                            checkIn.time
                          )}
                        </TableCell>
                        <TableCell className="p-2 font-medium text-foreground">
                          {isEditing ? (
                            <Input
                              value={editingState.name}
                              onChange={(event) => updateEditing("name", event.target.value)}
                              className="h-8 min-w-[220px] rounded-md border-border bg-background shadow-none"
                            />
                          ) : (
                            <div className="space-y-1.5">
                              <div className="leading-none">{checkIn.name}</div>
                              {relatedMember ? (
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none capitalize",
                                      getMemberStatusClasses(relatedMember.status)
                                    )}
                                  >
                                    {relatedMember.status}
                                  </span>
                                  <span className="truncate">
                                    {relatedMember.days_remaining >= 0
                                      ? `${relatedMember.days_remaining} dias restantes`
                                      : `${Math.abs(relatedMember.days_remaining)} dias vencido`}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant={!editingState.hasPurchase ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateEditing("hasPurchase", false)}
                                className={cn(
                                  "h-7 w-7 p-0",
                                  !editingState.hasPurchase
                                    ? "bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground"
                                )}
                              >
                                <LogIn className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant={editingState.hasPurchase ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateEditing("hasPurchase", true)}
                                className={cn(
                                  "h-7 w-7 p-0",
                                  editingState.hasPurchase
                                    ? "bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground"
                                )}
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            checkIn.hasPurchase ? (
                              <Badge className="border-0 bg-primary text-primary-foreground hover:bg-primary">
                                Si
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-border bg-background text-foreground hover:bg-background"
                              >
                                No
                              </Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell className="p-2 text-muted-foreground">
                          {isEditing ? (
                            <Select
                              value={getSelectValueForProductName(activeProducts, editingState.product)}
                              onValueChange={(value) => updateEditing("product", value)}
                              disabled={!editingState.hasPurchase || activeProducts.length === 0}
                            >
                              <SelectTrigger className="h-8 min-w-[220px] rounded-md border-border bg-background text-xs shadow-none">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeProducts.map((product) => (
                                  <SelectItem key={product.id} value={encodeProductSelectValue(product)}>
                                    {product.name} · {formatAmountCRC(product.price)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            checkIn.product ?? "—"
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? (
                            <Select
                              value={
                                editingState.hasPurchase
                                  ? editingState.paymentMethod
                                  : "NONE"
                              }
                              onValueChange={(value) =>
                                updateEditing(
                                  "paymentMethod",
                                  value as PaymentMethodValue
                                )
                              }
                              disabled={!editingState.hasPurchase}
                            >
                              <SelectTrigger className="h-8 w-[128px] rounded-md border-border bg-background text-xs shadow-none">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">-</SelectItem>
                                <SelectItem value="TARJETA">TARJETA</SelectItem>
                                <SelectItem value="EFECTIVO">EFECTIVO</SelectItem>
                                <SelectItem value="SINPE">SINPE</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : checkIn.paymentMethod ? (
                            <Badge variant="outline" className="border-border text-foreground">
                              {checkIn.paymentMethod}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate p-2 text-muted-foreground">
                          {isEditing ? (
                            <Input
                              value={editingState.notes}
                              onChange={(event) => updateEditing("notes", event.target.value)}
                              placeholder="Notas..."
                              className="h-8 min-w-[160px] rounded-md border-border bg-background shadow-none"
                            />
                          ) : (
                            checkIn.notes ?? "—"
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 transition hover:bg-accent dark:text-emerald-400"
                                aria-label={`Guardar ${checkIn.name}`}
                                onClick={saveEditing}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition hover:bg-accent dark:text-red-400"
                                aria-label={`Eliminar ${checkIn.name}`}
                                onClick={() => setConfirmingDelete(true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                                aria-label={`Cancelar edicion de ${checkIn.name}`}
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                              aria-label={`Editar ${checkIn.name}`}
                              onClick={() => startEditing(checkIn)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </main>
  );
}
