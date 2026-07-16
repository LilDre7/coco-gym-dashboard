export type DashboardNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export const DASHBOARD_NOTES_STORAGE_KEY = "coco-gym-dashboard-notes-v1";

function isDashboardNote(value: unknown): value is DashboardNote {
  if (!value || typeof value !== "object") return false;

  const note = value as Partial<DashboardNote>;
  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    typeof note.body === "string" &&
    typeof note.createdAt === "string" &&
    typeof note.updatedAt === "string"
  );
}

export function readDashboardNotes(): DashboardNote[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DASHBOARD_NOTES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isDashboardNote);
  } catch {
    return [];
  }
}

export function writeDashboardNotes(notes: DashboardNote[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    DASHBOARD_NOTES_STORAGE_KEY,
    JSON.stringify(notes)
  );
}

export function sortDashboardNotes(notes: DashboardNote[]): DashboardNote[] {
  return [...notes].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function formatDashboardNoteDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function createDashboardNoteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
