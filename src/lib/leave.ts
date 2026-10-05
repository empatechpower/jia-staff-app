import { api, fetchAllBubblePages } from "./api";
export { isValidDateKey } from "./dates";

export const LEAVE_TYPES = [
  "Annual Leave",
  "Medical Leave (MC)",
  "Birthday Leave",
  "Hospitalisation Leave (HL)",
  "Unpaid Leave",
  "Childcare Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Shared Parental Leave",
] as const;

export const LEAVE_FIELDS: Record<string, { abbr: string; entitled: string; used: string }> = {
  "Annual Leave": { abbr: "AL", entitled: "annual_leave", used: "annual_leave_used" },
  "Medical Leave (MC)": { abbr: "MC", entitled: "medical_leave", used: "medical_leave_used" },
  "Birthday Leave": { abbr: "BL", entitled: "birthday_leave", used: "birthday_leave_used" },
  "Hospitalisation Leave (HL)": { abbr: "HL", entitled: "hospitalisation_leave", used: "hospitalisation_leave_used" },
  "Unpaid Leave": { abbr: "UPL", entitled: "unpaid_leave", used: "unpaid_leave_used" },
  "Childcare Leave": { abbr: "CCL", entitled: "childcare_leave", used: "childcare_leave_used" },
  "Maternity Leave": { abbr: "ML", entitled: "maternity_leave", used: "maternity_leave_used" },
  "Paternity Leave": { abbr: "PL", entitled: "paternity_leave", used: "paternity_leave_used" },
  "Shared Parental Leave": { abbr: "SPL", entitled: "shared_parental_leave", used: "shared_parental_leave_used" },
};

export type Entitlement = { type: string; abbr: string; entitlement: number; used: number };

export function mapEntitlements(raw: any): Entitlement[] {
  let row = raw;
  if (Array.isArray(row?.results)) row = row.results[0];
  if (Array.isArray(row)) row = row[0];
  return LEAVE_TYPES.map((type) => {
    const f = LEAVE_FIELDS[type];
    return {
      type,
      abbr: f.abbr,
      entitlement: Number(row?.[f.entitled] ?? 0),
      used: Number(row?.[f.used] ?? 0),
    };
  });
}

export type DayType = "full" | "am" | "pm";

export type LeaveRecord = {
  id: string;
  leaveType: string;
  days: number;
  startDayType: DayType;
  endDayType: DayType;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  month: string;
  year: number;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function mapLeaveRecords(rows: any[]): LeaveRecord[] {
  return rows.map((r) => {
    const from = new Date(r.from_date);
    const valid = !isNaN(from.getTime());
    return {
      id: r._id,
      leaveType: r.leave_type ?? "",
      days: Number(r.days_requested ?? 0),
      startDayType: (r.start_day_type ?? r.day_type ?? "full") as DayType,
      endDayType: (r.end_day_type ?? r.day_type ?? "full") as DayType,
      from: String(r.from_date ?? ""),
      to: String(r.to_date ?? ""),
      status: String(r.status ?? "pending").toLowerCase() as LeaveRecord["status"],
      reason: r.reason ?? "",
      month: valid ? MONTHS[from.getMonth()] : "",
      year: valid ? from.getFullYear() : 0,
    };
  });
}

// Loads history plus still-pending requests (which the history endpoint doesn't include).
export async function loadLeaveHistory(staffId: string): Promise<LeaveRecord[]> {
  const [history, all] = await Promise.all([
    fetchAllBubblePages<any>((c) => api.hr.getLeaveHistory(staffId, c)).catch(() => []),
    fetchAllBubblePages<any>((c) => api.hr.getStaffLeaveRequests(staffId, c)).catch(() => []),
  ]);
  const seen = new Set(history.map((r: any) => r._id));
  const pending = all.filter((r: any) => String(r.status ?? "pending").toLowerCase() === "pending" && !seen.has(r._id));
  return mapLeaveRecords([...history, ...pending]);
}

// Same working-day rule as the web app: half days count as 0.5 at each end.
export function calcDays(from: string, to: string, startType: DayType, endType: DayType): number {
  if (!from || !to) return 0;
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  if (isNaN(f) || isNaN(t) || t < f) return 0;
  if (from === to) return startType === "full" ? 1 : 0.5;
  const total = Math.max(1, Math.round((t - f) / 86400000) + 1);
  const startVal = startType === "full" ? 1 : 0.5;
  const endVal = endType === "full" ? 1 : 0.5;
  return startVal + endVal + Math.max(0, total - 2);
}

