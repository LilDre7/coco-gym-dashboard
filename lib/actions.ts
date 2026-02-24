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
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateTag("members", "max");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
