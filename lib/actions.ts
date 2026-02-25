"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { MemberRow, Discipline, Currency } from "./types";

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

  const payload = {
    ...formData,
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

  let { error } = await supabase
    .from("members")
    .update(formData)
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

export async function renewMember(id: string, extensionDays = 30) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member, error: fetchError } = await supabase
    .from("members")
    .select("end_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentEndDate = new Date(member.end_date);
  currentEndDate.setHours(0, 0, 0, 0);

  const renewalBaseDate = currentEndDate < today ? today : currentEndDate;
  const renewedEndDate = new Date(renewalBaseDate);
  renewedEndDate.setDate(renewedEndDate.getDate() + extensionDays);

  const { error: updateError } = await supabase
    .from("members")
    .update({
      end_date: toIsoDate(renewedEndDate),
      is_active: true,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);
  revalidateTag("members", "max");
}
