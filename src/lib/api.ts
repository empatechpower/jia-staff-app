import * as SecureStore from "expo-secure-store";
import { BASE } from "./config";

export const TOKEN_KEY = "jia_token";
export const USER_ID_KEY = "jia_user_id";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parse(res: Response): Promise<any> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (data?.error_class === "Unauthorized" || data?.translation?.includes("Invalid or expired token")) {
    throw new SessionExpiredError();
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.reason || `Request failed (${res.status})`);
  }
  return data;
}

async function post<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/wf${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return parse(res);
}

// `path` includes its own query string, same as the web client.
async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/wf${path}`, { headers: await authHeaders() });
  return parse(res);
}

export const api = {
  auth: {
    login: (email: string, password: string) => post("/login", { email, password }),
  },
  user: {
    me: () => get("/get_current_user"),
    employeeId: (userId: string) => get(`/get_employee_id?user_id=${userId}`),
  },
  hr: {
    getAllProjects: () => get("/get_all_hr_projects"),
    getTodayTimesheet: (staffId: string) => get(`/get_staff_timesheet?staff_id=${staffId}`),
    getProjectAttendance: (timesheetEntryId: string) =>
      get(`/get_project_attendance?timesheet_entry_id=${timesheetEntryId}`),
    clockIn: (payload: {
      staff_id: string;
      location_type: string;
      latitude?: number;
      longitude?: number;
      clock_in_time: string;
      hr_project_id?: string;
    }) => post<{ response: { timesheet_entry_id: string } }>("/clock_in", payload),
    clockOut: (payload: { timesheet_entry_id: string; clock_out_time: string }) =>
      post("/clock_out", payload),
    recordProjectAttendance: (payload: {
      timesheet_entry_id: string;
      staff_id: string;
      hr_project_id: string;
      work_type: string;
      start_time: string;
    }) => post<{ response: { entry_id: string } }>("/record_project_attendance", payload),
    endProjectAttendance: (payload: { entry_id: string; end_time: string }) =>
      post("/end_project_attendance", payload),
    getStaffTimesheet: (staffId: string, month: number, year: number) => {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const next = new Date(year, month, 1);
      const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
      return get(`/get_staff_timesheet?staff_id=${staffId}&from_date=${from}&to_date=${to}`);
    },
    getLeaveEntitlements: (staffId: string) => get(`/get_leave_entitlements?staff_id=${staffId}`),
    getLeaveHistory: (staffId: string, cursor = 0, limit = 100) =>
      get(`/get_leave_history?staff_id=${staffId}&cursor=${cursor}&limit=${limit}`),
    getStaffLeaveRequests: (staffId: string, cursor = 0, limit = 100) =>
      get(`/get_staff_leave_requests?staff_id=${staffId}&cursor=${cursor}&limit=${limit}`),
    submitLeaveRequest: (payload: Record<string, any>) => post("/submit_leave_request", payload),
    getStaffPettyCashClaims: (staffId: string, cursor = 0, limit = 100) =>
      get(`/get_staff_petty_cash_claims?staff_id=${staffId}&cursor=${cursor}&limit=${limit}`),
    submitPettyCashClaim: (payload: Record<string, any>) => post("/submit_petty_cash_claim", payload),
    updatePettyCashClaim: (claimId: string, payload: Record<string, any>) =>
      post("/update_petty_cash_claim", { claim_id: claimId, ...payload }),
    getAllSuppliers: () => get("/get_all_suppliers"),
  },
};

// Pages through a Bubble list endpoint until `remaining` runs out.
export async function fetchAllBubblePages<T>(
  fetchPage: (cursor: number) => Promise<any>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor = 0;
  for (let page = 0; page < 100; page++) {
    const res = await fetchPage(cursor);
    const rows: T[] = res?.response?.results ?? [];
    all.push(...rows);
    const remaining = res?.response?.remaining ?? 0;
    if (remaining <= 0 || rows.length === 0) break;
    cursor += rows.length;
  }
  return all;
}
