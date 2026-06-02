import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// Local-time YYYY-MM-DD (avoids UTC off-by-one around day/month boundaries).
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export type RangePreset =
  | "this-week"
  | "last-7"
  | "this-month"
  | "last-month"
  | "last-30"
  | "this-year"
  | "custom";

export const PRESET_LABELS: { value: RangePreset; label: string }[] = [
  { value: "this-week", label: "This Week" },
  { value: "last-7", label: "Last 7 Days" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-30", label: "Last 30 Days" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export function presetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minusDays = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return d;
  };
  switch (preset) {
    case "this-week": {
      const dow = (today.getDay() + 6) % 7; // Monday = 0
      return { from: fmtDate(minusDays(dow)), to: fmtDate(today) };
    }
    case "last-7":
      return { from: fmtDate(minusDays(6)), to: fmtDate(today) };
    case "last-month":
      return {
        from: fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: fmtDate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "last-30":
      return { from: fmtDate(minusDays(29)), to: fmtDate(today) };
    case "this-year":
      return { from: fmtDate(new Date(now.getFullYear(), 0, 1)), to: fmtDate(today) };
    case "this-month":
    default:
      return {
        from: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
  }
}

type DateRangeState = { preset: RangePreset; from: string; to: string };

type DateRangeContextValue = DateRangeState & {
  applyPreset: (preset: RangePreset) => void;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
};

const STORAGE_KEY = "gsc.dateRange";

function loadInitial(): DateRangeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DateRangeState>;
      if (parsed.from && parsed.to && parsed.preset) {
        return { preset: parsed.preset, from: parsed.from, to: parsed.to };
      }
    }
  } catch {
    // ignore malformed storage
  }
  return { preset: "this-month", ...presetRange("this-month") };
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DateRangeState>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage write failures
    }
  }, [state]);

  const applyPreset = useCallback((preset: RangePreset) => {
    setState((prev) =>
      preset === "custom"
        ? { ...prev, preset }
        : { preset, ...presetRange(preset) },
    );
  }, []);

  // Ignore empty values (native date input emits "" when cleared) and keep the
  // pair ordered so {from,to} is always a valid range the backend will accept.
  const setFrom = useCallback((from: string) => {
    if (!from) return;
    setState((prev) => ({ ...prev, preset: "custom", from, to: from > prev.to ? from : prev.to }));
  }, []);

  const setTo = useCallback((to: string) => {
    if (!to) return;
    setState((prev) => ({ ...prev, preset: "custom", to, from: to < prev.from ? to : prev.from }));
  }, []);

  return (
    <DateRangeContext.Provider value={{ ...state, applyPreset, setFrom, setTo }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within a DateRangeProvider");
  return ctx;
}
