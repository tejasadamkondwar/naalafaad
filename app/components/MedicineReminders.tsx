"use client";

/*
 * ================= Medicine Reminders (personal organizational aid) =================
 * Self-contained feature: reminders are created manually by the user and are
 * stored ONLY in this browser's localStorage (no server, no push, no external
 * services). Nothing here derives dosage, frequency, duration, or schedule
 * information from the medicine dataset, and nothing here participates in the
 * Schedule H prescription guard or the chat reply logic in app/page.tsx.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";

/* ------------------------------- Types ------------------------------- */

/** How often a reminder repeats. Only these two options exist. */
export type RepeatRule = "none" | "daily";

/** A reminder exactly as the user entered it. Never inferred from medicine data. */
export type Reminder = {
  /** Unique id, generated client-side when the reminder is created. */
  id: string;
  /** Medicine name, exactly as typed by the user (required). */
  medicineName: string;
  /** Optional instructions already provided by a doctor or pharmacist. */
  instructions: string;
  /** Local reminder time in 24-hour HH:MM format (required). */
  time: string;
  /** Local start date in YYYY-MM-DD format (required). */
  startDate: string;
  /** Optional local end date in YYYY-MM-DD format; null = no end date. */
  endDate: string | null;
  /** Repeat rule chosen by the user. */
  repeat: RepeatRule;
  /** Optional free-text notes. */
  notes: string;
  /** Epoch milliseconds when the reminder was created. */
  createdAt: number;
};

/** Per-occurrence completion, keyed by `${reminderId}|YYYY-MM-DD`. */
export type CompletionMap = Record<string, "taken" | "skipped">;

/** Alert dismissals, keyed like CompletionMap; value = epoch milliseconds. */
export type DismissedMap = Record<string, number>;

/** Versioned localStorage envelope — reminder organizational data only. */
export type StoredData = {
  version: 1;
  reminders: Reminder[];
  completions: CompletionMap;
  dismissed: DismissedMap;
};

/** Status of one occurrence (one reminder on one local date). */
export type OccurrenceStatus =
  | "upcoming"
  | "due"
  | "taken"
  | "skipped"
  | "missed";

/** One concrete occurrence of a reminder (reminder + date + exact local time). */
export type Occurrence = {
  reminder: Reminder;
  dateKey: string;
  at: Date;
};

/** Controlled form state. Every field is a string; "" means empty/none. */
type ReminderForm = {
  medicineName: string;
  instructions: string;
  time: string;
  startDate: string;
  endDate: string;
  repeat: RepeatRule;
  notes: string;
};

/** Field-level validation errors for the reminder form. */
type ReminderFormErrors = {
  medicineName?: string;
  instructions?: string;
  time?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

/** Minimal storage surface (mockable in tests; never touched during SSR). */
type SafeStorage = Pick<Storage, "getItem" | "setItem">;

/* ------------------------------ Constants ------------------------------ */

/** localStorage key — versioned; only reminder data is ever written here. */
export const STORAGE_KEY = "medibot.reminders.v1";
/** An occurrence stays "due" (and alertable) for this long after its time. */
export const DUE_WINDOW_MS = 30 * 60 * 1000;
/** How often the open page checks for due reminders (local browser time). */
const CHECK_INTERVAL_MS = 10 * 1000;
/** Horizon (days) for the "Upcoming" list of daily reminders. */
const UPCOMING_DAYS = 7;
/** How far back unmarked missed occurrences are listed (display only). */
const MISSED_LOOKBACK_DAYS = 7;
/** Dismissed-alert entries older than this are pruned when loading. */
const DISMISSED_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
/** Maximum characters for the free-text fields. */
const MAX_TEXT = 500;
const MAX_NAME = 120;
/** 24-hour local time as produced by <input type="time">. Hours AND minutes
 * are both captured — occurrenceDate() reads match[1] and match[2]. */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Stable ids so every label is programmatically associated with its control. */
const FIELD_ID = {
  medicineName: "reminder-medicine-name",
  instructions: "reminder-instructions",
  time: "reminder-time",
  startDate: "reminder-start-date",
  endDate: "reminder-end-date",
  repeatNone: "reminder-repeat-none",
  repeatDaily: "reminder-repeat-daily",
  notes: "reminder-notes",
} as const;

/* -------------------- Local-time helpers (no timezone drift) -------------------- */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYY-MM-DD of a date in the browser's local time zone. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse YYYY-MM-DD as a local date; null when missing or malformed. */
export function parseDateKey(key: string): Date | null {
  if (!DATE_PATTERN.test(key)) return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  const parsed = new Date(year, month - 1, day);
  // Reject rolled-over values such as 2026-02-31.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Storage/list key for one occurrence of one reminder. */
export function occurrenceKey(reminderId: string, dateKey: string): string {
  return `${reminderId}|${dateKey}`;
}

/** Exact local Date of an occurrence; null when the fields are malformed. */
export function occurrenceDate(
  reminder: Reminder,
  dateKey: string
): Date | null {
  const base = parseDateKey(dateKey);
  const match = TIME_PATTERN.exec(reminder.time);
  if (base === null || match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  // Defensive: never let a malformed time produce an Invalid Date (NaN).
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  base.setHours(hours, minutes, 0, 0);
  return base;
}

/** True when the reminder has an occurrence on dateKey (rule + date range). */
export function hasOccurrenceOn(reminder: Reminder, dateKey: string): boolean {
  if (dateKey < reminder.startDate) return false;
  if (reminder.endDate !== null && dateKey > reminder.endDate) return false;
  if (reminder.repeat === "none") return dateKey === reminder.startDate;
  return true; // daily
}

/**
 * Status of one occurrence at `now` (local time). Returns null when the
 * reminder simply has no occurrence on that date. Completions are stored per
 * occurrence/date, so completing today never completes tomorrow.
 */
export function occurrenceStatus(
  reminder: Reminder,
  dateKey: string,
  completions: CompletionMap,
  now: Date
): OccurrenceStatus | null {
  if (!hasOccurrenceOn(reminder, dateKey)) return null;
  const done = completions[occurrenceKey(reminder.id, dateKey)];
  if (done === "taken" || done === "skipped") return done;
  const at = occurrenceDate(reminder, dateKey);
  if (at === null) return null;
  const scheduled = at.getTime();
  if (now.getTime() < scheduled) return "upcoming";
  if (now.getTime() < scheduled + DUE_WINDOW_MS) return "due";
  return "missed";
}

/* ---------------------------- Occurrence queries ---------------------------- */

/** Future occurrences of one reminder (local time > now), capped at the horizon. */
export function futureOccurrences(
  reminder: Reminder,
  now: Date
): Occurrence[] {
  const out: Occurrence[] = [];

  if (reminder.repeat === "none") {
    const at = occurrenceDate(reminder, reminder.startDate);
    if (at !== null && at.getTime() > now.getTime()) {
      out.push({ reminder, dateKey: reminder.startDate, at });
    }
    return out;
  }

  // Daily: walk local dates starting from max(startDate, today).
  const nowKey = toDateKey(now);
  const firstKey = nowKey > reminder.startDate ? nowKey : reminder.startDate;
  const first = parseDateKey(firstKey);
  if (first === null) return out;
  for (let i = 0; i <= UPCOMING_DAYS; i++) {
    const key = toDateKey(addDays(first, i));
    if (reminder.endDate !== null && key > reminder.endDate) break;
    const at = occurrenceDate(reminder, key);
    if (at !== null && at.getTime() > now.getTime()) {
      out.push({ reminder, dateKey: key, at });
    }
  }
  return out;
}

/** Uncompleted missed occurrences on PRIOR days (display only — never alerts). */
export function missedOccurrences(
  reminder: Reminder,
  now: Date,
  completions: CompletionMap
): Occurrence[] {
  const out: Occurrence[] = [];
  const today = parseDateKey(toDateKey(now));
  if (today === null) return out;
  for (let i = 1; i <= MISSED_LOOKBACK_DAYS; i++) {
    const key = toDateKey(addDays(today, -i));
    if (occurrenceStatus(reminder, key, completions, now) === "missed") {
      const at = occurrenceDate(reminder, key);
      if (at !== null) out.push({ reminder, dateKey: key, at });
    }
  }
  return out;
}

/**
 * Earliest occurrence that is DUE right now and has neither been completed
 * nor dismissed. Occurrences outside the due window are never returned, so a
 * page opened hours late yields "Missed" instead of an unbounded alert backlog.
 */
export function findDueOccurrence(
  reminders: Reminder[],
  completions: CompletionMap,
  dismissed: DismissedMap,
  now: Date
): Occurrence | null {
  const nowKey = toDateKey(now);
  let best: Occurrence | null = null;
  for (const reminder of reminders) {
    if (!hasOccurrenceOn(reminder, nowKey)) continue;
    const key = occurrenceKey(reminder.id, nowKey);
    if (completions[key] !== undefined) continue;
    if (dismissed[key] !== undefined) continue;
    const at = occurrenceDate(reminder, nowKey);
    if (at === null) continue;
    const scheduled = at.getTime();
    if (now.getTime() < scheduled) continue; // never alert before the time
    if (now.getTime() >= scheduled + DUE_WINDOW_MS) continue; // too late: missed
    if (best === null || scheduled < best.at.getTime()) {
      best = { reminder, dateKey: nowKey, at };
    }
  }
  return best;
}

/** Client-side unique id: crypto.randomUUID with a safe fallback. */
export function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `rem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Epoch milliseconds. Declared at module scope (like createId) so component
 * handlers stay free of direct impure calls during render analysis.
 */
function nowMs(): number {
  return Date.now();
}

/* --------------------------- Display formatting --------------------------- */

function formatFullDate(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  if (parsed === null) return dateKey;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Today" / "Tomorrow" / "Mon, Oct 12" for a local date key. */
function formatDayLabel(dateKey: string, now: Date): string {
  const nowKey = toDateKey(now);
  if (dateKey === nowKey) return "Today";
  if (dateKey === toDateKey(addDays(now, 1))) return "Tomorrow";
  return formatFullDate(dateKey);
}

/** "today at 08:30" / "tomorrow at 08:30" / "Mon, Oct 12 at 08:30". */
function formatWhen(dateKey: string, time: string, now: Date): string {
  const day = formatDayLabel(dateKey, now);
  const label =
    day === "Today" ? "today" : day === "Tomorrow" ? "tomorrow" : day;
  return `${label} at ${time}`;
}

/* ----------------------------- Safe localStorage ----------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReminder(value: unknown): value is Reminder {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.medicineName === "string" &&
    typeof value.instructions === "string" &&
    typeof value.time === "string" &&
    TIME_PATTERN.test(value.time) &&
    typeof value.startDate === "string" &&
    parseDateKey(value.startDate) !== null &&
    (value.endDate === null ||
      (typeof value.endDate === "string" &&
        parseDateKey(value.endDate) !== null)) &&
    (value.repeat === "none" || value.repeat === "daily") &&
    typeof value.notes === "string" &&
    typeof value.createdAt === "number"
  );
}

function isCompletionMap(value: unknown): value is CompletionMap {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (entry) => entry === "taken" || entry === "skipped"
  );
}

function isDismissedMap(value: unknown): value is DismissedMap {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (entry) => typeof entry === "number" && Number.isFinite(entry)
  );
}

/** Shape check for the stored envelope (guards against malformed JSON). */
export function isStoredData(value: unknown): value is StoredData {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    Array.isArray(value.reminders) &&
    value.reminders.every(isReminder) &&
    isCompletionMap(value.completions) &&
    isDismissedMap(value.dismissed)
  );
}

function pruneDismissed(
  dismissed: DismissedMap,
  nowMs: number
): DismissedMap {
  const out: DismissedMap = {};
  for (const [key, at] of Object.entries(dismissed)) {
    if (nowMs - at < DISMISSED_RETENTION_MS) out[key] = at;
  }
  return out;
}

/**
 * Read the reminder store. Returns null for missing, malformed, or
 * inaccessible storage — never throws, and never runs during server
 * rendering (pass null when no storage is available).
 */
export function loadStoredData(
  storage: SafeStorage | null,
  nowMs: number = Date.now()
): StoredData | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredData(parsed)) return null; // malformed → treated as empty
    return {
      version: 1,
      reminders: parsed.reminders,
      completions: parsed.completions,
      dismissed: pruneDismissed(parsed.dismissed, nowMs),
    };
  } catch {
    return null; // JSON or storage access failed (private mode, quota, …)
  }
}

/**
 * Write the reminder store. Returns false when storage is unavailable or
 * full — the rest of the page keeps working either way.
 */
export function saveStoredData(
  storage: SafeStorage | null,
  data: StoredData
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------ Form validation ------------------------------ */

const EMPTY_FORM: ReminderForm = {
  medicineName: "",
  instructions: "",
  time: "",
  startDate: "",
  endDate: "",
  repeat: "none",
  notes: "",
};

/**
 * Validate the add/edit form. Structural checks only — no medical logic and
 * nothing inferred from the medicine dataset.
 */
export function validateForm(form: ReminderForm): ReminderFormErrors {
  const errors: ReminderFormErrors = {};

  const name = form.medicineName.trim();
  if (name === "") {
    errors.medicineName = "Medicine name is required.";
  } else if (name.length > MAX_NAME) {
    errors.medicineName = `Medicine name is too long (max ${MAX_NAME} characters).`;
  }

  if (form.instructions.length > MAX_TEXT) {
    errors.instructions = `Instructions are too long (max ${MAX_TEXT} characters).`;
  }

  if (!TIME_PATTERN.test(form.time)) {
    errors.time = "Choose a reminder time in HH:MM format.";
  }

  if (form.startDate === "" || parseDateKey(form.startDate) === null) {
    errors.startDate = "Choose a valid start date.";
  }

  if (form.endDate !== "") {
    if (parseDateKey(form.endDate) === null) {
      errors.endDate = "Choose a valid end date, or leave it empty.";
    } else if (
      errors.startDate === undefined &&
      form.endDate < form.startDate
    ) {
      errors.endDate = "End date must be on or after the start date.";
    }
  }

  if (form.notes.length > MAX_TEXT) {
    errors.notes = `Notes are too long (max ${MAX_TEXT} characters).`;
  }

  return errors;
}

/* ------------------------- Shared style constants (matches page.tsx) ------------------------- */

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const inputClass = (hasError: boolean): string =>
  "w-full rounded-2xl border " +
  (hasError ? "border-rose-400 " : "border-[#dbe5f5] ") +
  "bg-white px-4 py-3 text-sm text-navy outline-none transition " +
  "placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10";

const errorClass = "mt-1.5 text-xs text-rose-400";

const primaryBtnClass =
  "rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]";

const pillBtnClass =
  "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700";

const mutedPillBtnClass =
  "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700";

const dangerPillBtnClass =
  "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600";

const takenBtnClass =
  "rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100";

const skipBtnClass =
  "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-amber-300 hover:text-amber-700";

const rowCardClass =
  "rounded-2xl border border-[#e4ebf7] bg-white p-4 shadow-sm";

const listCardClass =
  "rounded-2xl border border-[#e4ebf7] bg-[#f8fbff] px-4 py-3 text-sm text-muted";

/** Colored status pill for one occurrence. */
const STATUS_STYLE: Record<
  OccurrenceStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  due: {
    label: "Due",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  taken: {
    label: "Taken",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  skipped: {
    label: "Skipped",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
  missed: {
    label: "Missed",
    className: "border-rose-200 bg-rose-50 text-rose-600",
  },
};

function StatusChip({ status }: { status: OccurrenceStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider " +
        style.className
      }
    >
      {style.label}
    </span>
  );
}

/**
 * Deterministic clock placeholder used for the static prerender and the
 * hydration render (identical on server and client, so no mismatch). The
 * real local clock is applied in the mount effect below — never during
 * rendering — which also keeps `new Date()` out of the prerender path.
 */
const PRERENDER_CLOCK = new Date(0);

/* -------------------------------- Component -------------------------------- */

export default function MedicineReminders() {
  // Reminder store (reminders + per-occurrence completions + dismissals).
  // Starts empty on both server and client, then loads from localStorage
  // after mount — this avoids Next.js hydration mismatches entirely.
  const [store, setStore] = useState<StoredData>({
    version: 1,
    reminders: [],
    completions: {},
    dismissed: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [storageNote, setStorageNote] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [now, setNow] = useState<Date>(PRERENDER_CLOCK);
  const [activeAlert, setActiveAlert] = useState<Occurrence | null>(null);

  // Session guards so one occurrence can never alert twice.
  const activeAlertRef = useRef<Occurrence | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());
  const storageRef = useRef<SafeStorage | null>(null);

  const [form, setForm] = useState<ReminderForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReminderFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Load saved reminders once, after the client mounts (never during SSR).
  useEffect(() => {
    let storage: SafeStorage | null = null;
    try {
      storage = typeof window === "undefined" ? null : window.localStorage;
      storage?.getItem(STORAGE_KEY); // probe: throws when storage is blocked
    } catch {
      storage = null;
    }
    storageRef.current = storage;
    const loaded = loadStoredData(storage);
    // Saved reminders must be read exactly once after mount (never during
    // SSR) or Next.js hydration would mismatch; loading external state in a
    // mount effect is the documented pattern for localStorage-backed UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded !== null) setStore(loaded);
    if (storage === null) {
      setStorageNote(
        "Browser storage is unavailable — reminders will be lost when this page is closed."
      );
    }
    // Sensible default for the required start date (client-side only).
    setForm((prev) =>
      prev.startDate === "" ? { ...prev, startDate: toDateKey(new Date()) } : prev
    );
    // Apply the real local clock in the same batched update as hydration so
    // lists never render against the prerender placeholder above.
    setNow(new Date());
    setHydrated(true);
  }, []);

  // Persist + set the store; surfaces a save failure without ever crashing.
  function applyStore(next: StoredData): void {
    setSaveFailed(!saveStoredData(storageRef.current, next));
    setStore(next);
  }

  /* ----------------------- Occurrence actions ----------------------- */

  /** Mark ONE occurrence (taken/skipped) — never the whole recurring rule. */
  function markOccurrence(
    reminderId: string,
    dateKey: string,
    status: "taken" | "skipped"
  ): void {
    const key = occurrenceKey(reminderId, dateKey);
    applyStore({
      ...store,
      completions: { ...store.completions, [key]: status },
    });
    alertedRef.current.add(key);
    // Close the alert if it was about this very occurrence.
    const open = activeAlertRef.current;
    if (
      open !== null &&
      occurrenceKey(open.reminder.id, open.dateKey) === key
    ) {
      activeAlertRef.current = null;
      setActiveAlert(null);
    }
  }

  /** Alert banner actions. "dismissed" hides only THIS occurrence's alert. */
  function handleAlertAction(kind: "taken" | "skipped" | "dismissed"): void {
    const open = activeAlertRef.current;
    if (open === null) return;
    const key = occurrenceKey(open.reminder.id, open.dateKey);
    if (kind === "dismissed") {
      applyStore({
        ...store,
        dismissed: { ...store.dismissed, [key]: nowMs() },
      });
    } else {
      applyStore({
        ...store,
        completions: { ...store.completions, [key]: kind },
      });
    }
    alertedRef.current.add(key);
    activeAlertRef.current = null;
    setActiveAlert(null);
  }

    /* --------------------------- Form actions --------------------------- */

  function resetForm(): void {
    setForm({ ...EMPTY_FORM, startDate: toDateKey(new Date()) });
    setErrors({});
    setEditingId(null);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setFormNotice(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (!hydrated) return; // never overwrite storage before it was read

    // Only the user's own entries go into the reminder — no dosage,
    // frequency, duration, or schedule is ever inferred anywhere.
    const entered = {
      medicineName: form.medicineName.trim(),
      instructions: form.instructions.trim(),
      time: form.time,
      startDate: form.startDate,
      endDate: form.endDate === "" ? null : form.endDate,
      repeat: form.repeat,
      notes: form.notes.trim(),
    };

    if (editingId !== null) {
      const reminders = store.reminders.map((reminder) =>
        reminder.id === editingId ? { ...reminder, ...entered } : reminder
      );
      applyStore({ ...store, reminders });
      resetForm();
      setFormNotice("Reminder updated — saved in this browser.");
    } else {
      const reminder: Reminder = {
        id: createId(),
        ...entered,
        createdAt: nowMs(),
      };
      applyStore({ ...store, reminders: [...store.reminders, reminder] });
      resetForm();
      setFormNotice("Reminder added — saved in this browser.");
    }
  }

  function startEdit(reminder: Reminder): void {
    setForm({
      medicineName: reminder.medicineName,
      instructions: reminder.instructions,
      time: reminder.time,
      startDate: reminder.startDate,
      endDate: reminder.endDate ?? "",
      repeat: reminder.repeat,
      notes: reminder.notes,
    });
    setErrors({});
    setFormNotice(null);
    setEditingId(reminder.id);
    // Move focus to the first field for keyboard / screen-reader users.
    window.requestAnimationFrame(() => {
      document.getElementById(FIELD_ID.medicineName)?.focus();
    });
  }

  function deleteReminder(id: string): void {
    const prefix = `${id}|`;
    const completions: CompletionMap = {};
    for (const [key, value] of Object.entries(store.completions)) {
      if (!key.startsWith(prefix)) completions[key] = value;
    }
    const dismissed: DismissedMap = {};
    for (const [key, value] of Object.entries(store.dismissed)) {
      if (!key.startsWith(prefix)) dismissed[key] = value;
    }
    applyStore({
      ...store,
      reminders: store.reminders.filter((r) => r.id !== id),
      completions,
      dismissed,
    });
    if (editingId === id) resetForm();
    setFormNotice("Reminder deleted.");
  }

  function deleteAllReminders(): void {
    applyStore({ version: 1, reminders: [], completions: {}, dismissed: {} });
    alertedRef.current.clear();
    activeAlertRef.current = null;
    setActiveAlert(null);
    setConfirmDeleteAll(false);
    resetForm();
    setFormNotice("All reminders deleted from this browser.");
  }

    /* ---------------- Due-reminder checking (only while open) ---------------- */

  useEffect(() => {
    if (!hydrated) return;

    const check = (): void => {
      const current = new Date();
      setNow(current);
      const due = findDueOccurrence(
        store.reminders,
        store.completions,
        store.dismissed,
        current
      );
      if (due === null || activeAlertRef.current !== null) return;
      const key = occurrenceKey(due.reminder.id, due.dateKey);
      if (alertedRef.current.has(key)) return; // never alert the same occurrence twice
      alertedRef.current.add(key);
      activeAlertRef.current = due;
      setActiveAlert(due);
    };

    check(); // immediate check on load and after any store change
    const timerId = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      // Exactly one interval exists at a time; always cleared on cleanup.
      window.clearInterval(timerId);
    };
  }, [hydrated, store]);

  // Auto-reset the "Delete all" confirmation so a stray click can't linger.
  useEffect(() => {
    if (!confirmDeleteAll) return;
    const timerId = window.setTimeout(() => setConfirmDeleteAll(false), 6000);
    return () => window.clearTimeout(timerId);
  }, [confirmDeleteAll]);

  /* --------------------------- Derived views --------------------------- */

  const nowKey = toDateKey(now);

  const todayRows = store.reminders
    .map((reminder) => ({
      reminder,
      status: occurrenceStatus(reminder, nowKey, store.completions, now),
    }))
    .filter(
      (row): row is { reminder: Reminder; status: OccurrenceStatus } =>
        row.status !== null
    )
    .sort((a, b) => a.reminder.time.localeCompare(b.reminder.time));

  const missedRows = store.reminders.flatMap((reminder) =>
    missedOccurrences(reminder, now, store.completions)
  );
  missedRows.sort((a, b) => b.at.getTime() - a.at.getTime());
  const visibleMissed = missedRows.slice(0, 6);

  const upcomingRows = store.reminders
    .flatMap((reminder) => futureOccurrences(reminder, now))
    .filter(
      (occ) =>
        store.completions[occurrenceKey(occ.reminder.id, occ.dateKey)] ===
        undefined
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const visibleUpcoming = upcomingRows.slice(0, 8);
  const nextOccurrence = upcomingRows.length > 0 ? upcomingRows[0] : null;

  const allReminders = [...store.reminders].sort((a, b) =>
    a.medicineName.localeCompare(b.medicineName)
  );

    return (
    <section
      aria-labelledby="reminders-heading"
      className="reminders-scope pb-2"
    >
      <div className="card p-6 sm:p-7">
        {/* -------- Section header -------- */}
        <div className="mb-5">
          <h3
            id="reminders-heading"
            className="text-gradient text-lg font-semibold tracking-tight"
          >
            💊 Medicine Reminders
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Enter times you already have from your doctor or pharmacist.
            Saved only in this browser — not synced to other devices.
          </p>
        </div>

        {storageNote !== null && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
          >
            {storageNote}
          </p>
        )}
        {storageNote === null && saveFailed && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700"
          >
            Reminder changes could not be saved in this browser (storage may
            be full or blocked). The changes are kept for this session only.
          </p>
        )}

        {/* -------- Add / edit reminder form -------- */}
        <form
          noValidate
          onSubmit={handleFormSubmit}
          className="mb-8 rounded-2xl border border-[#e4ebf7] bg-[#f8fbff] p-4 sm:p-5"
        >
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {editingId !== null ? "Edit reminder" : "Add a reminder"}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* 1. Medicine name (required) */}
            <div className="sm:col-span-2">
              <label htmlFor={FIELD_ID.medicineName} className={labelClass}>
                Medicine name{" "}
                <span aria-hidden className="text-rose-400">
                  *
                </span>
              </label>
              <input
                id={FIELD_ID.medicineName}
                type="text"
                autoComplete="off"
                maxLength={MAX_NAME}
                value={form.medicineName}
                onChange={(e) =>
                  setForm({ ...form, medicineName: e.target.value })
                }
                aria-invalid={errors.medicineName !== undefined}
                aria-describedby={
                  errors.medicineName !== undefined
                    ? `${FIELD_ID.medicineName}-error`
                    : undefined
                }
                className={inputClass(errors.medicineName !== undefined)}
              />
              {errors.medicineName !== undefined && (
                <p
                  id={`${FIELD_ID.medicineName}-error`}
                  role="alert"
                  className={errorClass}
                >
                  {errors.medicineName}
                </p>
              )}
            </div>

            {/* 2. Instructions (optional — user-entered only, never prefilled) */}
            <div className="sm:col-span-2">
              <label htmlFor={FIELD_ID.instructions} className={labelClass}>
                Instructions{" "}
                <span className="font-normal normal-case tracking-normal text-slate-600">
                  (optional)
                </span>
              </label>
              <textarea
                id={FIELD_ID.instructions}
                rows={2}
                maxLength={MAX_TEXT}
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                aria-invalid={errors.instructions !== undefined}
                aria-describedby={
                  errors.instructions !== undefined
                    ? `${FIELD_ID.instructions}-error`
                    : undefined
                }
                placeholder="Only instructions you were already given"
                className={inputClass(errors.instructions !== undefined)}
              />
              {errors.instructions !== undefined && (
                <p
                  id={`${FIELD_ID.instructions}-error`}
                  role="alert"
                  className={errorClass}
                >
                  {errors.instructions}
                </p>
              )}
            </div>

            {/* 3. Reminder time (required, local HH:MM) */}
            <div>
              <label htmlFor={FIELD_ID.time} className={labelClass}>
                Reminder time{" "}
                <span aria-hidden className="text-rose-400">
                  *
                </span>
              </label>
              <input
                id={FIELD_ID.time}
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                aria-invalid={errors.time !== undefined}
                aria-describedby={
                  errors.time !== undefined
                    ? `${FIELD_ID.time}-error`
                    : undefined
                }
                className={inputClass(errors.time !== undefined)}
              />
              {errors.time !== undefined && (
                <p id={`${FIELD_ID.time}-error`} role="alert" className={errorClass}>
                  {errors.time}
                </p>
              )}
            </div>

              {/* 4. Start date (required) */}
            <div>
              <label htmlFor={FIELD_ID.startDate} className={labelClass}>
                Start date{" "}
                <span aria-hidden className="text-rose-400">
                  *
                </span>
              </label>
              <input
                id={FIELD_ID.startDate}
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                aria-invalid={errors.startDate !== undefined}
                aria-describedby={
                  errors.startDate !== undefined
                    ? `${FIELD_ID.startDate}-error`
                    : undefined
                }
                className={inputClass(errors.startDate !== undefined)}
              />
              {errors.startDate !== undefined && (
                <p
                  id={`${FIELD_ID.startDate}-error`}
                  role="alert"
                  className={errorClass}
                >
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* 5. End date (optional) */}
            <div>
              <label htmlFor={FIELD_ID.endDate} className={labelClass}>
                End date{" "}
                <span className="font-normal normal-case tracking-normal text-slate-600">
                  (optional)
                </span>
              </label>
              <input
                id={FIELD_ID.endDate}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                aria-invalid={errors.endDate !== undefined}
                aria-describedby={
                  errors.endDate !== undefined
                    ? `${FIELD_ID.endDate}-error`
                    : undefined
                }
                className={inputClass(errors.endDate !== undefined)}
              />
              {errors.endDate !== undefined && (
                <p
                  id={`${FIELD_ID.endDate}-error`}
                  role="alert"
                  className={errorClass}
                >
                  {errors.endDate}
                </p>
              )}
            </div>

            {/* 6. Repeat — exactly two options, nothing inferred */}
            <fieldset className="sm:col-span-2">
              <legend className={labelClass}>Repeat</legend>
              <div className="flex flex-wrap gap-3 pt-1">
                <label
                  htmlFor={FIELD_ID.repeatNone}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dbe5f5] bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <input
                    id={FIELD_ID.repeatNone}
                    type="radio"
                    name="reminder-repeat"
                    value="none"
                    checked={form.repeat === "none"}
                    onChange={() => setForm({ ...form, repeat: "none" })}
                    className="h-4 w-4 accent-blue-500"
                  />
                  Does not repeat
                </label>

                <label
                  htmlFor={FIELD_ID.repeatDaily}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dbe5f5] bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <input
                    id={FIELD_ID.repeatDaily}
                    type="radio"
                    name="reminder-repeat"
                    value="daily"
                    checked={form.repeat === "daily"}
                    onChange={() => setForm({ ...form, repeat: "daily" })}
                    className="h-4 w-4 accent-blue-500"
                  />
                  Daily
                </label>
              </div>
            </fieldset>

              {/* 7. Notes (optional) */}
            <div className="sm:col-span-2">
              <label htmlFor={FIELD_ID.notes} className={labelClass}>
                Notes{" "}
                <span className="font-normal normal-case tracking-normal text-slate-600">
                  (optional)
                </span>
              </label>
              <textarea
                id={FIELD_ID.notes}
                rows={2}
                maxLength={MAX_TEXT}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                aria-invalid={errors.notes !== undefined}
                aria-describedby={
                  errors.notes !== undefined
                    ? `${FIELD_ID.notes}-error`
                    : undefined
                }
                className={inputClass(errors.notes !== undefined)}
              />
              {errors.notes !== undefined && (
                <p
                  id={`${FIELD_ID.notes}-error`}
                  role="alert"
                  className={errorClass}
                >
                  {errors.notes}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className={primaryBtnClass}>
              {editingId !== null ? "Save changes" : "Add reminder"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className={mutedPillBtnClass}
              >
                Cancel
              </button>
            )}
            {formNotice !== null && (
              <p role="status" className="text-xs font-medium text-emerald-400">
                {formNotice}
              </p>
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Enter the time exactly as you were instructed — MediBot does not
            suggest doses, frequencies, or schedules. Adding a reminder never
            means a medicine is safe or appropriate for you, and it does not
            affect MediBot&apos;s prescription-safety checks.
          </p>
        </form>

          {/* -------- Today's reminders + status -------- */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s reminders
            </h4>
            {hydrated && (
              <span className="text-xs text-slate-500">
                {formatFullDate(nowKey)}
              </span>
            )}
          </div>

          {!hydrated ? (
            <p className="text-sm text-slate-500">Loading reminders…</p>
          ) : allReminders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dbe5f5] bg-[#f8fbff] p-5">
              <p className="text-sm font-semibold text-navy">No reminders yet.</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Add your first reminder using the form above. Times are always
                entered by you — nothing is suggested or inferred.
              </p>
            </div>
          ) : todayRows.length === 0 ? (
            <p className={listCardClass}>No reminders scheduled for today.</p>
          ) : (
            <ul className="space-y-3">
              {todayRows.map(({ reminder, status }) => (
                <li key={reminder.id} className={rowCardClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">
                        <span className="mr-2 font-semibold text-blue-300">
                          {reminder.time}
                        </span>
                        {reminder.medicineName}
                      </p>
                      {reminder.instructions !== "" && (
                        <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                          {reminder.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={status} />
                      {status !== "taken" && status !== "skipped" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              markOccurrence(reminder.id, nowKey, "taken")
                            }
                            className={takenBtnClass}
                          >
                            Mark Taken
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              markOccurrence(reminder.id, nowKey, "skipped")
                            }
                            className={skipBtnClass}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

          {/* -------- Missed (prior days, display only — never alerted) -------- */}
        {hydrated &&
          allReminders.length > 0 &&
          visibleMissed.length > 0 && (
            <div className="mb-8">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Missed — not marked ({missedRows.length})
              </h4>
              <ul className="space-y-3">
                {visibleMissed.map((occ) => (
                  <li
                    key={occurrenceKey(occ.reminder.id, occ.dateKey)}
                    className={rowCardClass}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy">
                          <span className="mr-2 font-semibold text-blue-300">
                            {occ.reminder.time}
                          </span>
                          {occ.reminder.medicineName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFullDate(occ.dateKey)}
                        </p>
                        {occ.reminder.instructions !== "" && (
                          <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                            {occ.reminder.instructions}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status="missed" />
                        <button
                          type="button"
                          onClick={() =>
                            markOccurrence(occ.reminder.id, occ.dateKey, "taken")
                          }
                          className={takenBtnClass}
                        >
                          Mark Taken
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            markOccurrence(
                              occ.reminder.id,
                              occ.dateKey,
                              "skipped"
                            )
                          }
                          className={skipBtnClass}
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {missedRows.length > visibleMissed.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Showing {visibleMissed.length} of {missedRows.length}{" "}
                  missed occurrences.
                </p>
              )}
            </div>
          )}

          {/* -------- Upcoming + next reminder -------- */}
        <div className="mb-8">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Upcoming reminders
          </h4>

          {nextOccurrence !== null && (
            <p className="mb-3 rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2.5 text-xs leading-5 text-blue-200">
              <span className="font-semibold">Next reminder:</span>{" "}
              {nextOccurrence.reminder.medicineName} —{" "}
              {formatWhen(
                nextOccurrence.dateKey,
                nextOccurrence.reminder.time,
                now
              )}
            </p>
          )}

          {!hydrated ? (
            <p className="text-sm text-slate-500">Loading reminders…</p>
          ) : visibleUpcoming.length === 0 ? (
            <p className={listCardClass}>No upcoming reminders.</p>
          ) : (
            <ul className="space-y-3">
              {visibleUpcoming.map((occ) => (
                <li
                  key={occurrenceKey(occ.reminder.id, occ.dateKey)}
                  className={
                    rowCardClass +
                    " flex flex-wrap items-center justify-between gap-3"
                  }
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy">
                      <span className="mr-2 font-semibold text-blue-300">
                        {occ.reminder.time}
                      </span>
                      {occ.reminder.medicineName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDayLabel(occ.dateKey, now)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    {occ.reminder.repeat === "daily" ? "Daily" : "Once"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -------- All reminders (edit / delete) -------- */}
        <div className="mb-8">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            All reminders ({hydrated ? allReminders.length : 0})
          </h4>

          {!hydrated ? (
            <p className="text-sm text-slate-500">Loading reminders…</p>
          ) : allReminders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#dbe5f5] bg-[#f8fbff] px-4 py-6 text-center text-sm text-muted">
              Nothing here yet — reminders you add are listed in this browser.
            </p>
          ) : (
            <ul className="space-y-3">
              {allReminders.map((reminder) => {
                const next = futureOccurrences(reminder, now).find(
                  (occ) =>
                    store.completions[
                      occurrenceKey(reminder.id, occ.dateKey)
                    ] === undefined
                );
                return (
                  <li key={reminder.id} className={rowCardClass}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy">
                          {reminder.medicineName}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {reminder.time} ·{" "}
                          {reminder.repeat === "daily"
                            ? "Daily"
                            : "Does not repeat"}{" "}
                          · starts {formatFullDate(reminder.startDate)}
                          {reminder.endDate !== null &&
                            ` · ends ${formatFullDate(reminder.endDate)}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {next !== undefined
                            ? `Next: ${formatWhen(next.dateKey, reminder.time, now)}`
                            : "No future occurrences."}
                        </p>
                        {reminder.instructions !== "" && (
                          <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                            <span className="text-slate-500">
                              Instructions:
                            </span>{" "}
                            {reminder.instructions}
                          </p>
                        )}
                        {reminder.notes !== "" && (
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                            Notes: {reminder.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(reminder)}
                          className={pillBtnClass}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReminder(reminder.id)}
                          className={dangerPillBtnClass}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

          {/* -------- Privacy & safety notices -------- */}
        <div className="rounded-2xl border border-[#e4ebf7] bg-[#f8fbff] p-4 sm:p-5">
          <p className="text-xs leading-5 text-muted">
            <span className="font-semibold text-navy">
              Reminders are organizational aids only. Follow the instructions
              provided by your qualified healthcare professional. MediBot does
              not prescribe medication or verify that a reminder schedule is
              medically appropriate. Reminders only work while this page is
              open; they may be delayed or missed.
            </span>
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Reminders are saved locally in this browser on this device and are
            not synced to other devices. They may be lost if this site&apos;s
            data is cleared. This is a lightweight in-app reminder — not a
            dependable emergency or clinical alert system, and not a clinically
            reliable medication-adherence system. No browser notifications,
            sounds, email, or external services are used.
          </p>

          {hydrated && allReminders.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {confirmDeleteAll ? (
                <>
                  <button
                    type="button"
                    onClick={deleteAllReminders}
                    className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                  >
                    Confirm — delete all reminders
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(false)}
                    className={mutedPillBtnClass}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                  className={dangerPillBtnClass}
                >
                  Delete all reminders
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------- In-app alert (in-page only; no notifications, no sound) -------- */}
      {activeAlert !== null && (
        <div
          role="alert"
          className="msg-in fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-amber-300 bg-white p-4 shadow-xl shadow-amber-900/10 ring-1 ring-amber-200"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            ⏰ Medicine reminder
          </p>
          <p className="mt-2 text-sm font-semibold text-navy">
            {activeAlert.reminder.medicineName}
            <span className="ml-2 font-normal text-blue-300">
              at {activeAlert.reminder.time}
            </span>
          </p>
          {activeAlert.reminder.instructions !== "" && (
            <p className="mt-1 break-words text-xs leading-5 text-slate-300">
              {activeAlert.reminder.instructions}
            </p>
          )}
          {activeAlert.reminder.notes !== "" && (
            <p className="mt-1 break-words text-xs leading-5 text-slate-400">
              {activeAlert.reminder.notes}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAlertAction("taken")}
              className={takenBtnClass}
            >
              Mark Taken
            </button>
            <button
              type="button"
              onClick={() => handleAlertAction("skipped")}
              className={skipBtnClass}
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => handleAlertAction("dismissed")}
              className={mutedPillBtnClass}
            >
              Dismiss
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            Lightweight in-app reminder — only while this page is open.
          </p>
        </div>
      )}
    </section>
  );
}
