import { MemberRow, MemberWithStatus, MemberStatus, Currency } from "./types";
import { COSTA_RICA_TIME_ZONE } from "./checkins";

export const EXPIRING_THRESHOLD_DAYS = 4;

const costaRicaDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: COSTA_RICA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day"): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getDateKeyInCostaRica(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = costaRicaDatePartsFormatter.formatToParts(date);
  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");
  return `${year}-${month}-${day}`;
}

function getStableDateForDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function getTodayDateKeyInCostaRica(): string {
  return getDateKeyInCostaRica(new Date());
}

export function formatPersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'-])([a-záéíóúüñ])/g, (match) => match.toUpperCase());
}

function normalizeForNameCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function getFirstNameAndSurnameKey(value: string): string {
  const normalized = normalizeForNameCompare(value);
  if (!normalized) return "";
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function parseDateValue(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateDaysRemaining(endDate: string): number {
  const today = getStableDateForDateKey(getTodayDateKeyInCostaRica());
  const expDate = /^(\d{4})-(\d{2})-(\d{2})$/.test(endDate)
    ? getStableDateForDateKey(endDate)
    : getStableDateForDateKey(getDateKeyInCostaRica(endDate));
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateTenureDays(startDate: string): number {
  const today = getStableDateForDateKey(getTodayDateKeyInCostaRica());
  const start = /^(\d{4})-(\d{2})-(\d{2})$/.test(startDate)
    ? getStableDateForDateKey(startDate)
    : getStableDateForDateKey(getDateKeyInCostaRica(startDate));
  const diffTime = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function getStatus(daysRemaining: number, isActive: boolean): MemberStatus {
  if (!isActive) return "inactive";
  if (daysRemaining < 0) return "expired";
  if (daysRemaining === 0) return "payment-due";
  if (daysRemaining <= EXPIRING_THRESHOLD_DAYS) return "expiring";
  return "active";
}

export function isBillableStatus(status: MemberStatus): boolean {
  return (
    status === "active" ||
    status === "expiring" ||
    status === "payment-due"
  );
}

export function isRenewalStatus(status: MemberStatus): boolean {
  return (
    status === "expiring" ||
    status === "payment-due" ||
    status === "expired"
  );
}

export function isDueSoonStatus(status: MemberStatus): boolean {
  return status === "expiring" || status === "payment-due";
}

export function enrichMemberData(member: MemberRow): MemberWithStatus {
  const days_remaining = calculateDaysRemaining(member.end_date);
  const status = getStatus(days_remaining, member.is_active);
  const tenure_days = calculateTenureDays(member.start_date);
  return { ...member, days_remaining, status, tenure_days };
}

export function formatTenure(tenureDays: number): string {
  if (tenureDays < 30) return `${tenureDays}d`;
  const months = Math.floor(tenureDays / 30);
  const days = tenureDays % 30;
  if (days === 0) return `${months}mo`;
  return `${months}mo ${days}d`;
}

export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `506${digits}`;
  return digits;
}

export function formatCurrency(
  amount: number,
  currency: Currency = "USD"
): string {
  if (currency === "CRC") {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return parseDateValue(dateString).toLocaleDateString("en-US", {
    timeZone: COSTA_RICA_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
