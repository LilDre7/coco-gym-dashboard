"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { MemberRow, Discipline, Currency, StoreProductRow } from "./types";
import {
  COSTA_RICA_UTC_OFFSET,
  CheckIn,
  CheckInInput,
  CheckInRow,
  mapCheckInRow,
} from "./checkins";
import { formatPersonName, getFirstNameAndSurnameKey } from "./member-utils";

const MISSING_CHECK_INS_TABLE_ERROR = "MISSING_CHECK_INS_TABLE";
const MISSING_STORE_PRODUCTS_TABLE_ERROR = "MISSING_STORE_PRODUCTS_TABLE";

function isMissingMembersPhotoUrlColumnError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find") &&
    normalized.includes("'photo_url'") &&
    normalized.includes("'members'") &&
    normalized.includes("schema cache")
  );
}

function isMissingMembersCurrencyColumnError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find") &&
    normalized.includes("'currency'") &&
    normalized.includes("'members'") &&
    normalized.includes("schema cache")
  );
}

function normalizeMemberRow(row: Partial<MemberRow>): MemberRow {
  return {
    id: row.id ?? "",
    user_id: row.user_id ?? "",
    name: row.name ?? "",
    photo_url: row.photo_url ?? "",
    discipline: (row.discipline as Discipline | undefined) ?? "routine-monthly",
    monthly_fee:
      typeof row.monthly_fee === "number"
        ? row.monthly_fee
        : Number(row.monthly_fee ?? 0),
    currency: (row.currency as Currency | undefined) ?? "CRC",
    start_date: row.start_date ?? "",
    end_date: row.end_date ?? "",
    phone: row.phone ?? "",
    description: row.description ?? "",
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? "",
  };
}

async function insertMemberWithLegacyFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    name: string;
    photo_url: string;
    discipline: Discipline;
    monthly_fee: number;
    currency: Currency;
    start_date: string;
    end_date: string;
    phone: string;
    description: string;
    user_id: string;
  }
) {
  let nextPayload: Record<string, unknown> = { ...payload };

  while (true) {
    const { error } = await supabase.from("members").insert(nextPayload);
    if (!error) return;

    if (isMissingMembersPhotoUrlColumnError(error.message) && "photo_url" in nextPayload) {
      delete nextPayload.photo_url;
      continue;
    }

    if (isMissingMembersCurrencyColumnError(error.message) && "currency" in nextPayload) {
      delete nextPayload.currency;
      continue;
    }

    throw new Error(error.message);
  }
}

async function updateMemberWithLegacyFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  memberId: string,
  payload: {
    name: string;
    photo_url: string;
    discipline: Discipline;
    monthly_fee: number;
    currency: Currency;
    start_date: string;
    end_date: string;
    phone: string;
    description: string;
  }
) {
  let nextPayload: Record<string, unknown> = { ...payload };

  while (true) {
    const { error } = await supabase
      .from("members")
      .update(nextPayload)
      .eq("id", memberId)
      .eq("user_id", userId);

    if (!error) return;

    if (isMissingMembersPhotoUrlColumnError(error.message) && "photo_url" in nextPayload) {
      delete nextPayload.photo_url;
      continue;
    }

    if (isMissingMembersCurrencyColumnError(error.message) && "currency" in nextPayload) {
      delete nextPayload.currency;
      continue;
    }

    throw new Error(error.message);
  }
}

function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

function isMissingCheckInsTableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("check_ins") &&
    (
      normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("does not exist") ||
      normalized.includes("relation") ||
      normalized.includes("undefined table")
    )
  );
}

function throwMissingCheckInsTableError() {
  throw new Error(MISSING_CHECK_INS_TABLE_ERROR);
}

function isMissingStoreProductsTableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("store_products") &&
    (
      normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("does not exist") ||
      normalized.includes("relation") ||
      normalized.includes("undefined table")
    )
  );
}

function throwMissingStoreProductsTableError() {
  throw new Error(MISSING_STORE_PRODUCTS_TABLE_ERROR);
}

function toCostaRicaIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00${COSTA_RICA_UTC_OFFSET}`).toISOString();
}

async function assertUniqueByFirstNameAndSurname(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  candidateName: string;
  excludeMemberId?: string;
}) {
  const { supabase, userId, candidateName, excludeMemberId } = params;
  const candidateKey = getFirstNameAndSurnameKey(candidateName);
  if (!candidateKey) return;

  let query = supabase
    .from("members")
    .select("id, name")
    .eq("user_id", userId);

  if (excludeMemberId?.trim()) {
    query = query.neq("id", excludeMemberId.trim());
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const duplicate = (data ?? []).find((member) => {
    return getFirstNameAndSurnameKey(member.name) === candidateKey;
  });

  if (duplicate) {
    throw new Error("DUPLICATE_MEMBER_FIRST_NAME_LAST_NAME");
  }
}

export async function getMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Partial<MemberRow>[]).map(normalizeMemberRow);
}

export async function addMember(formData: {
  name: string;
  photo_url: string;
  discipline: Discipline;
  monthly_fee: number;
  currency: Currency;
  start_date: string;
  end_date: string;
  phone: string;
  description: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const normalizedName = formatPersonName(formData.name);
  await assertUniqueByFirstNameAndSurname({
    supabase,
    userId: user.id,
    candidateName: normalizedName,
  });

  const payload = {
    ...formData,
    name: normalizedName,
    user_id: user.id,
  };

  await insertMemberWithLegacyFallback(supabase, payload);
  revalidateTag("members", "max");
}

export async function updateMember(
  id: string,
  formData: {
    name: string;
    photo_url: string;
    discipline: Discipline;
    monthly_fee: number;
    currency: Currency;
    start_date: string;
    end_date: string;
    phone: string;
    description: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const normalizedName = formatPersonName(formData.name);
  const { data: existingMember, error: existingMemberError } = await supabase
    .from("members")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMemberError) throw new Error(existingMemberError.message);

  const existingNameKey = getFirstNameAndSurnameKey(existingMember?.name ?? "");
  const normalizedNameKey = getFirstNameAndSurnameKey(normalizedName);

  if (existingNameKey !== normalizedNameKey) {
    await assertUniqueByFirstNameAndSurname({
      supabase,
      userId: user.id,
      candidateName: normalizedName,
      excludeMemberId: id,
    });
  }

  await updateMemberWithLegacyFallback(supabase, user.id, id, {
    ...formData,
    name: normalizedName,
  });
  revalidateTag("members", "max");
}

export async function deleteMember(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("members")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateTag("members", "max");
}

export async function setMemberActiveStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("members")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateTag("members", "max");
}

export async function hardDeleteMember(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existingMember, error: fetchError } = await supabase
    .from("members")
    .select("photo_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  const existingPhotoPath = existingMember?.photo_url ?? "";
  if (isStoragePath(existingPhotoPath)) {
    const { error: storageError } = await supabase.storage
      .from("faces")
      .remove([existingPhotoPath]);
    if (storageError) {
      console.warn("Failed to delete member photo from storage:", storageError);
    }
  }

  revalidateTag("members", "max");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getCheckIns() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("occurred_at", { ascending: true });

  if (error && isMissingCheckInsTableError(error.message)) {
    return [];
  }
  if (error) throw new Error(error.message);
  return ((data ?? []) as CheckInRow[]).map(mapCheckInRow);
}

export async function addCheckIn(input: CheckInInput): Promise<CheckIn> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const occurredAtIso = toCostaRicaIsoDateTime(input.date, input.time);
  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      occurred_at: occurredAtIso,
      has_purchase: input.hasPurchase,
      product: input.hasPurchase ? input.product?.trim() ?? "" : "",
      payment_method: input.hasPurchase ? input.paymentMethod ?? null : null,
      amount: input.hasPurchase && typeof input.amount === "number" ? input.amount : null,
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error && isMissingCheckInsTableError(error.message)) {
    throwMissingCheckInsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("check-ins", "max");
  return mapCheckInRow(data as CheckInRow);
}

export async function updateCheckIn(id: string, input: CheckInInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const occurredAtIso = toCostaRicaIsoDateTime(input.date, input.time);
  const { error } = await supabase
    .from("check_ins")
    .update({
      name: input.name.trim(),
      occurred_at: occurredAtIso,
      has_purchase: input.hasPurchase,
      product: input.hasPurchase ? input.product?.trim() ?? "" : "",
      payment_method: input.hasPurchase ? input.paymentMethod ?? null : null,
      amount: input.hasPurchase && typeof input.amount === "number" ? input.amount : null,
      notes: input.notes?.trim() ?? "",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingCheckInsTableError(error.message)) {
    throwMissingCheckInsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("check-ins", "max");
}

export async function deleteCheckIn(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("check_ins")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingCheckInsTableError(error.message)) {
    throwMissingCheckInsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("check-ins", "max");
}

export async function getStoreProducts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .order("is_active", { ascending: false })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error && isMissingStoreProductsTableError(error.message)) {
    return [];
  }
  if (error) throw new Error(error.message);

  return ((data ?? []) as (Omit<StoreProductRow, "price"> & { price: number | string })[]).map(
    (product) => ({
      ...product,
      price:
        typeof product.price === "number"
          ? product.price
          : Number(product.price),
    })
  );
}

export async function addStoreProduct(formData: {
  name: string;
  category: string;
  price: number;
}): Promise<StoreProductRow> {
  const normalizedName = formData.name.trim().replace(/\s+/g, "-").toUpperCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("store_products")
    .insert({
      user_id: user.id,
      name: normalizedName,
      category: formData.category.trim(),
      price: formData.price,
    })
    .select("*")
    .single();

  if (error && isMissingStoreProductsTableError(error.message)) {
    throwMissingStoreProductsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("store-products", "max");
  const createdProduct = data as Omit<StoreProductRow, "price"> & { price: number | string };
  return {
    ...createdProduct,
    price:
      typeof createdProduct.price === "number"
        ? createdProduct.price
        : Number(createdProduct.price),
  };
}

export async function updateStoreProduct(
  id: string,
  formData: {
    name: string;
    category: string;
    price: number;
  }
) {
  const normalizedName = formData.name.trim().replace(/\s+/g, "-").toUpperCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("store_products")
    .update({
      name: normalizedName,
      category: formData.category.trim(),
      price: formData.price,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingStoreProductsTableError(error.message)) {
    throwMissingStoreProductsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("store-products", "max");
}

export async function setStoreProductActiveStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("store_products")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingStoreProductsTableError(error.message)) {
    throwMissingStoreProductsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("store-products", "max");
}

export async function hardDeleteStoreProduct(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("store_products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingStoreProductsTableError(error.message)) {
    throwMissingStoreProductsTableError();
  }
  if (error) throw new Error(error.message);
  revalidateTag("store-products", "max");
}

function toIsoDate(value: Date): string {
  return value.toISOString().split("T")[0];
}

function addOneCalendarMonthKeepingDay(anchorDate: Date): Date {
  const year = anchorDate.getFullYear();
  const targetMonth = anchorDate.getMonth() + 1;
  const anchorDay = anchorDate.getDate();
  const lastDayOfTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(anchorDay, lastDayOfTargetMonth);
  return new Date(year, targetMonth, clampedDay);
}

export async function renewMember(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Renewal is anchored to payment date (today), keeping calendar day:
  // e.g., pay on 21 -> expires on 21 next month.
  const renewedEndDate = addOneCalendarMonthKeepingDay(today);
  const shouldBeActive = renewedEndDate >= today;

  const { error: updateError } = await supabase
    .from("members")
    .update({
      end_date: toIsoDate(renewedEndDate),
      is_active: shouldBeActive,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);
  revalidateTag("members", "max");
}
