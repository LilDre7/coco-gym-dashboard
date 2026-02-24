import { MemberRow, MemberWithStatus, MemberStatus, Currency } from "./types";

export function calculateDaysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(endDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateTenureDays(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function getStatus(daysRemaining: number): MemberStatus {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 5) return "expiring";
  return "active";
}

export function enrichMemberData(member: MemberRow): MemberWithStatus {
  const days_remaining = calculateDaysRemaining(member.end_date);
  const status = getStatus(days_remaining);
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
  return phone.replace(/\D/g, "");
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
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
