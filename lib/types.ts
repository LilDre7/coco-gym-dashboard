export type Discipline =
  | "gym"
  | "gym-simple"
  | "personal"
  | "crossfit"
  | "sessions";

export type MemberStatus = "active" | "expiring" | "expired" | "inactive";

export type Currency = "USD" | "CRC";

// Matches the Supabase DB schema (snake_case)
export interface MemberRow {
  id: string;
  user_id: string;
  name: string;
  photo_url: string;
  discipline: Discipline;
  monthly_fee: number;
  currency: Currency;
  start_date: string;
  end_date: string;
  phone: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface MemberWithStatus extends MemberRow {
  days_remaining: number;
  status: MemberStatus;
  tenure_days: number;
}

export const disciplineLabels: Record<Discipline, string> = {
  gym: "Gym",
  "gym-simple": "Gym Simple",
  personal: "Personal Training",
  crossfit: "CrossFit",
  sessions: "Sessions",
};

export const disciplineFeesUSD: Record<Discipline, number> = {
  gym: 50,
  "gym-simple": 35,
  personal: 120,
  crossfit: 80,
  sessions: 15,
};

export const disciplineFeesCRC: Record<Discipline, number> = {
  gym: 25000,
  "gym-simple": 18000,
  personal: 60000,
  crossfit: 40000,
  sessions: 7500,
};
