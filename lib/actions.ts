"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { MemberRow, Discipline, Currency } from "./types";
import { formatPersonName, getFirstNameAndSurnameKey } from "./member-utils";

function isMissingMembersPhotoUrlColumnError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find") &&
    normalized.includes("'photo_url'") &&
    normalized.includes("'members'") &&
    normalized.includes("schema cache")
  );
}

function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
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

  const { data, error } = await supabase
    .from("members")
    .select("id, name")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const duplicate = (data ?? []).find((member) => {
    if (excludeMemberId && member.id === excludeMemberId) return false;
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
  return data ?? [];
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

  let { error } = await supabase.from("members").insert(payload);
  if (error && isMissingMembersPhotoUrlColumnError(error.message)) {
    const { photo_url: _photoUrl, ...fallbackPayload } = payload;
    ({ error } = await supabase.from("members").insert(fallbackPayload));
  }
  if (error) throw new Error(error.message);
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
  await assertUniqueByFirstNameAndSurname({
    supabase,
    userId: user.id,
    candidateName: normalizedName,
    excludeMemberId: id,
  });

  let { error } = await supabase
    .from("members")
    .update({
      ...formData,
      name: normalizedName,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error && isMissingMembersPhotoUrlColumnError(error.message)) {
    const { photo_url: _photoUrl, ...fallbackPayload } = formData;
    ({ error } = await supabase
      .from("members")
      .update(fallbackPayload)
      .eq("id", id)
      .eq("user_id", user.id));
  }

  if (error) throw new Error(error.message);
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
