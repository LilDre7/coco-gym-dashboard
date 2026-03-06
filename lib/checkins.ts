export type PaymentMethod = "TARJETA" | "EFECTIVO" | "SINPE";

export type CheckInRow = {
  id: string;
  user_id: string;
  name: string;
  occurred_at: string;
  has_purchase: boolean;
  product: string;
  payment_method: PaymentMethod | null;
  amount: number | string | null;
  notes: string;
  created_at: string;
};

export type CheckIn = {
  id: string;
  time: string;
  datetime: string;
  name: string;
  hasPurchase: boolean;
  product?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  amount?: number;
};

export type CheckInInput = {
  name: string;
  date: string;
  time: string;
  hasPurchase: boolean;
  product?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  amount?: number;
};

export type AttendanceRankingEntry = {
  name: string;
  visits: number;
};

export const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";
export const COSTA_RICA_UTC_OFFSET = "-06:00";

const costaRicaDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: COSTA_RICA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const costaRicaTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: COSTA_RICA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day"): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getStableDateForDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function setLocalTime(date: Date, hours: number, minutes: number): Date {
  const copy = new Date(date);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function shiftDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function buildCheckIn(
  date: Date,
  time: string,
  name: string,
  options: {
    hasPurchase?: boolean;
    product?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
    amount?: number;
  } = {}
): CheckIn {
  const [hours, minutes] = time.split(":").map(Number);
  const datetime = setLocalTime(date, hours, minutes);

  return {
    id: `${formatLocalDateKey(datetime)}-${time}-${name.toLowerCase().replace(/\s+/g, "-")}`,
    time,
    datetime: datetime.toISOString(),
    name,
    hasPurchase: options.hasPurchase ?? false,
    product: options.product,
    paymentMethod: options.paymentMethod,
    notes: options.notes,
    amount: options.amount,
  };
}

export function buildCheckInDateTime(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00${COSTA_RICA_UTC_OFFSET}`);
}

export function mapCheckInRow(row: CheckInRow): CheckIn {
  const datetime = new Date(row.occurred_at);
  const amount =
    typeof row.amount === "number"
      ? row.amount
      : typeof row.amount === "string"
        ? Number(row.amount)
        : undefined;

  return {
    id: row.id,
    time: costaRicaTimeFormatter.format(datetime),
    datetime: row.occurred_at,
    name: row.name,
    hasPurchase: row.has_purchase,
    product: row.product || undefined,
    paymentMethod: row.payment_method ?? undefined,
    notes: row.notes || undefined,
    amount: Number.isFinite(amount) ? amount : undefined,
  };
}

export function formatLocalDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = costaRicaDatePartsFormatter.formatToParts(date);
  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");
  return `${year}-${month}-${day}`;
}

export function formatTimeHHMMInCostaRica(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return costaRicaTimeFormatter.format(date);
}

export function formatMonthLabel(dateKey: string): string {
  const date = getStableDateForDateKey(dateKey);
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: COSTA_RICA_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatSelectedDate(dateKey: string): string {
  const date = getStableDateForDateKey(dateKey);
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: COSTA_RICA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatAmountCRC(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMonthlyAttendanceRanking(
  checkIns: CheckIn[],
  selectedDate: string,
  limit = 5
): AttendanceRankingEntry[] {
  const selectedMonthKey = selectedDate.slice(0, 7);
  const attendanceDaysByName = new Map<string, Set<string>>();

  for (const checkIn of checkIns) {
    const dateKey = formatLocalDateKey(checkIn.datetime);
    if (!dateKey.startsWith(selectedMonthKey)) continue;

    if (!attendanceDaysByName.has(checkIn.name)) {
      attendanceDaysByName.set(checkIn.name, new Set<string>());
    }
    attendanceDaysByName.get(checkIn.name)?.add(dateKey);
  }

  const sorted = Array.from(attendanceDaysByName.entries())
    .map(([name, days]) => ({ name, visits: days.size }))
    .sort((left, right) => right.visits - left.visits || left.name.localeCompare(right.name));

  if (sorted.length <= limit) return sorted;

  const cutoff = sorted[limit - 1]?.visits ?? 0;
  return sorted.filter((entry) => entry.visits >= cutoff);
}

export function generateSampleCheckIns(anchorDate = new Date()): CheckIn[] {
  const today = new Date(anchorDate);
  today.setHours(0, 0, 0, 0);

  const yesterday = shiftDays(today, -1);
  const twoDaysAgo = shiftDays(today, -2);
  const threeDaysAgo = shiftDays(today, -3);
  const fiveDaysAgo = shiftDays(today, -5);
  const eightDaysAgo = shiftDays(today, -8);
  const tenDaysAgo = shiftDays(today, -10);
  const thirteenDaysAgo = shiftDays(today, -13);

  return [
    buildCheckIn(today, "06:09", "Panuelito Douglas", { hasPurchase: true, product: "Day Pass", paymentMethod: "SINPE", notes: "Primera visita del mes", amount: 5000 }),
    buildCheckIn(today, "06:42", "Veronica Baltodano", { notes: "Clase de movilidad" }),
    buildCheckIn(today, "07:15", "Alejandra Leiva", { hasPurchase: true, product: "Mensualidad Routine", paymentMethod: "TARJETA", amount: 36000 }),
    buildCheckIn(today, "07:48", "Alejandro Keto", {}),
    buildCheckIn(today, "08:03", "Daniela Rojas", { hasPurchase: true, product: "Crossfit", paymentMethod: "EFECTIVO", amount: 42000 }),
    buildCheckIn(today, "08:29", "Marcos Chaves", { notes: "Invito a un amigo" }),
    buildCheckIn(today, "09:01", "Andrea Solano", { hasPurchase: true, product: "Day Pass", paymentMethod: "SINPE", amount: 5000 }),
    buildCheckIn(today, "10:14", "Fabian Mora", { hasPurchase: true, product: "Mensualidad Simple", paymentMethod: "EFECTIVO", amount: 27000 }),
    buildCheckIn(today, "11:26", "Alejandra Leiva", {}),
    buildCheckIn(today, "12:40", "Alejandro Keto", { hasPurchase: true, product: "Day Pass", paymentMethod: "TARJETA", amount: 5000 }),
    buildCheckIn(today, "14:05", "Catalina Urena", { notes: "Requiere seguimiento" }),
    buildCheckIn(today, "15:18", "Alejandro Keto", {}),
    buildCheckIn(today, "16:02", "Alejandra Leiva", {}),
    buildCheckIn(today, "17:27", "Sofia Quesada", { hasPurchase: true, product: "Day Pass", paymentMethod: "SINPE", amount: 5000 }),
    buildCheckIn(today, "18:11", "Marcos Chaves", {}),
    buildCheckIn(today, "19:05", "Veronica Baltodano", {}),
    buildCheckIn(yesterday, "06:20", "Alejandra Leiva", {}),
    buildCheckIn(yesterday, "07:05", "Alejandro Keto", {}),
    buildCheckIn(yesterday, "08:12", "Marcos Chaves", {}),
    buildCheckIn(yesterday, "17:35", "Alejandra Leiva", {}),
    buildCheckIn(twoDaysAgo, "06:32", "Alejandra Leiva", {}),
    buildCheckIn(twoDaysAgo, "07:41", "Alejandro Keto", {}),
    buildCheckIn(twoDaysAgo, "18:02", "Veronica Baltodano", {}),
    buildCheckIn(threeDaysAgo, "06:16", "Alejandra Leiva", {}),
    buildCheckIn(threeDaysAgo, "06:58", "Alejandro Keto", {}),
    buildCheckIn(threeDaysAgo, "16:44", "Marcos Chaves", {}),
    buildCheckIn(fiveDaysAgo, "07:11", "Alejandra Leiva", {}),
    buildCheckIn(fiveDaysAgo, "07:52", "Alejandro Keto", {}),
    buildCheckIn(eightDaysAgo, "06:47", "Veronica Baltodano", {}),
    buildCheckIn(eightDaysAgo, "08:18", "Alejandra Leiva", {}),
    buildCheckIn(tenDaysAgo, "07:08", "Alejandro Keto", {}),
    buildCheckIn(tenDaysAgo, "18:09", "Marcos Chaves", {}),
    buildCheckIn(thirteenDaysAgo, "06:55", "Alejandra Leiva", {}),
    buildCheckIn(thirteenDaysAgo, "17:12", "Alejandro Keto", {}),
  ].sort((left, right) => new Date(left.datetime).getTime() - new Date(right.datetime).getTime());
}
