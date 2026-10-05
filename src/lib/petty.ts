import { api, fetchAllBubblePages } from "./api";

export type PettyStatus = "pending" | "approved" | "rejected";
export type Currency = "SGD" | "MYR";

export type Claim = {
  id: string;
  date: string;
  supplier: string;
  projectName: string;
  currency: Currency;
  amount: number;
  attachmentUrl: string;
  status: PettyStatus;
  rejectionReason: string;
  month: string;
  year: number;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Bubble returns a date-typed field as a timestamp, and a text field as a string. Normalise both.
export function toDateString(v: unknown): string {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (!v) return "";
  const d = new Date(v as any);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function mapClaims(rows: any[]): Claim[] {
  return rows.map((r) => {
    const date = toDateString(r.date);
    const d = new Date(date);
    const valid = !isNaN(d.getTime());
    return {
      id: r._id,
      date,
      supplier: r.supplier ?? "",
      projectName: r.project_name ?? "",
      currency: r.currency === "MYR" ? "MYR" : "SGD",
      amount: Number(r.amount ?? 0),
      attachmentUrl: r.attachment ?? r.attachment_url ?? "",
      status: r.status === "approved" || r.status === "rejected" ? r.status : "pending",
      rejectionReason: r.rejection_reason ?? "",
      month: valid ? MONTHS[d.getMonth()] : "",
      year: valid ? d.getFullYear() : 0,
    };
  });
}

export async function loadClaims(staffId: string): Promise<Claim[]> {
  const rows = await fetchAllBubblePages<any>((c) => api.hr.getStaffPettyCashClaims(staffId, c));
  return mapClaims(rows);
}

export async function loadSuppliers(): Promise<string[]> {
  const res: any = await api.hr.getAllSuppliers();
  const names = (res?.response?.results ?? []).map((s: any) => s.name ?? "").filter(Boolean) as string[];
  return Array.from(new Set(names)).sort();
}

// Totals are per currency, never summed across currencies.
export function totalsByCurrency(list: Claim[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { SGD: 0, MYR: 0 };
  for (const c of list) totals[c.currency] += c.amount;
  return totals;
}

export function formatTotals(list: Claim[]): string {
  const t = totalsByCurrency(list);
  const parts = (["SGD", "MYR"] as Currency[])
    .filter((cur) => list.some((c) => c.currency === cur))
    .map((cur) => `${cur} ${t[cur].toFixed(2)}`);
  return parts.length ? parts.join(" · ") : "—";
}
