export type Discipline =
  | "week-1"
  | "week-2"
  | "week-3"
  | "day-pass"
  | "routine-monthly"
  | "simple-monthly"
  | "crossfit"
  | "personal-trainer";

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
  "week-1": "1 Semana",
  "week-2": "2 Semanas",
  "week-3": "3 Semanas",
  "day-pass": "Day Pass",
  "routine-monthly": "Mensualidad Routine",
  "simple-monthly": "Mensualidad Simple",
  crossfit: "Crossfit",
  "personal-trainer": "Personal Trainer",
};

export const disciplineFeesUSD: Record<Discipline, number> = {
  "week-1": 30,
  "week-2": 40,
  "week-3": 46,
  "day-pass": 10,
  "routine-monthly": 72,
  "simple-monthly": 54,
  crossfit: 84,
  "personal-trainer": 120,
};

export const disciplineFeesCRC: Record<Discipline, number> = {
  "week-1": 15000,
  "week-2": 20000,
  "week-3": 23000,
  "day-pass": 5000,
  "routine-monthly": 36000,
  "simple-monthly": 27000,
  crossfit: 42000,
  "personal-trainer": 60000,
};
