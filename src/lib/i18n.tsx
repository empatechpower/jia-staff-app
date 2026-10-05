import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

export type Lang = "en" | "zh";
const LANG_KEY = "jia_lang";

const en = {
  hello: "Hello",
  myRecords: "My Records", myRecordsSub: "View your timesheet and pay records.",
  leaveRequest: "Leave Request", leaveRequestSub: "Apply for leave or check your balance.",
  pettyCash: "Petty Cash Claim", pettyCashSub: "Submit a claim for reimbursement.",
  clockIn: "Clock In", clockInSub: "Clock in your attendance here.",
  startMyDay: "Start My Day", startTime: "Start Time", startDayBtn: "Clock In",
  endMyDay: "End My Day", startedAt: "Started my day at:", todayProjects: "Today's Project Time",
  recordProject: "Record Project Attendance", clockOutProject: "Clock Out Project",
  location: "Location", project: "Project", workType: "Work type",
  loc_onsite: "On Site", loc_office: "Office", loc_wfh: "WFH",
  ongoing: "Ongoing", signOut: "Sign out", back: "Back",
  month: "Month", year: "Year", all: "All", noRecords: "No records for this month.",
  day: "day", days: "days", claim: "claim", claims: "claims",
  // records
  colStart: "Start", colEnd: "End", colProject: "Project", colProjectStart: "Project start",
  colProjectEnd: "Project end", colHours: "Hours", colOT: "OT hours", colEarned: "Amount earned",
  // leave
  leaveEntitlement: "Leave Entitlement", viewHistory: "View History", leaveHistory: "Leave History",
  applyLeave: "Apply for Leave", selectLeaveType: "Select a leave type", leaveType: "Leave type",
  fromDate: "From date (yyyy-mm-dd)", toDate: "To date (yyyy-mm-dd)", startDayType: "Start day",
  endDayType: "End day", fullDay: "Full day", amHalf: "AM", pmHalf: "PM", reason: "Reason",
  reasonPlaceholder: "Briefly describe the reason", optional: "optional",
  uploadCert: "Attach certificate (required)", replaceCert: "Replace certificate",
  leaveRequested: "Leave requested", balanceAfter: "Balance after", sendRequest: "Send Leave Request",
  requestSent: "Request sent", requestSentDesc: "Your leave request has been submitted for approval.",
  submitAnother: "Submit another", backHome: "Back to home", submitting: "Sending…",
  colLeaveType: "Leave type", colEntitled: "Entitled", colUsed: "Used", colRemaining: "Remaining",
  colFrom: "From", colTo: "To", colDays: "Days", colStatus: "Status", colReason: "Reason",
  approved: "Approved", rejected: "Rejected", pending: "Pending", cancelled: "Cancelled",
  insufficientBalance: "Not enough remaining balance for these dates.",
  toDateBeforeFrom: "To date can't be before from date.",
  attachmentRequired: "Please attach the certificate before submitting.",
  submitError: "Failed to submit. Please try again.",
  // petty cash
  pcDate: "Date", pcSupplier: "Supplier", pcSelectProject: "Select a project",
  pcCurrency: "Currency", pcAmount: "Amount", pcAttachment: "Photo / receipt (required)",
  pcAttachmentHint: "Take a photo of the receipt or attach a file.",
  pcAddAnother: "Add another claim", pcQueued: "Queued claims", pcRemove: "Remove",
  pcSubmit: "Submit claim", pcSubmitAll: "Submit all claims", pcSubmitting: "Submitting…",
  pcClaimSent: "Claim submitted", pcClaimSentDesc: "Your petty cash claim has been submitted for approval.",
  pcSubmitError: "Failed to submit petty cash claim. Please try again.",
  pcHistory: "Petty Cash History", pcNoClaims: "No claims submitted yet.",
  pcTotalClaimed: "Total claimed", pcEdit: "Edit claim", pcSaveChanges: "Save changes",
  pcSaveError: "Failed to save changes. Please try again.", pcClaimUpdated: "Claim updated",
  pcEditUnavailable: "This claim can no longer be edited.",
  pcReplaceAttachment: "Replace attachment", pcViewAttachment: "View attachment",
  pcRequired: "required", pcDateRequired: "Date is required.", pcSupplierRequired: "Supplier is required.",
  pcProjectRequired: "Please select a project.", pcAmountRequired: "Enter an amount greater than 0.",
  pcAttachmentRequired: "Please attach a photo or file before submitting.",
  pcFileTooLarge: "File must be under 10 MB.", pcFileType: "Only images and PDF files are supported.",
  pcRejectedReason: "Reason",
  lang: "中文",
  gpsRequired: "Location is required to clock in here.", selectProjectFirst: "Select a project first.",
  noSiteSaved: "This project has no site location saved.", mustBeWithin: "must be within",
  detecting: "Detecting location…", gpsDenied: "Location access denied.", withinRange: "Within range",
  locationRecorded: "Location recorded.", clockOutHint: "You're currently clocked into a project. Tap below to clock out.",
  clockOutBtn: "Clock Out", clockInProject: "Clock In to Project", takePhoto: "Take photo", chooseFile: "Choose file",
  m0: "January", m1: "February", m2: "March", m3: "April", m4: "May", m5: "June", m6: "July", m7: "August", m8: "September", m9: "October", m10: "November", m11: "December",
};

const zh: typeof en = {
  hello: "你好",
  myRecords: "我的记录", myRecordsSub: "查看你的考勤和薪酬记录。",
  leaveRequest: "请假申请", leaveRequestSub: "申请假期或查看余额。",
  pettyCash: "零用金报销", pettyCashSub: "提交报销申请。",
  clockIn: "打卡上班", clockInSub: "在此记录你的出勤。",
  startMyDay: "开始上班", startTime: "上班时间", startDayBtn: "打卡",
  endMyDay: "下班打卡", startedAt: "上班时间：", todayProjects: "今日项目工时",
  recordProject: "记录项目出勤", clockOutProject: "项目下班打卡",
  location: "工作地点", project: "项目", workType: "工作类型",
  loc_onsite: "工地", loc_office: "办公室", loc_wfh: "居家办公",
  ongoing: "进行中", signOut: "退出登录", back: "返回",
  month: "月份", year: "年份", all: "全部", noRecords: "本月没有记录。",
  day: "天", days: "天", claim: "笔申请", claims: "笔申请",
  colStart: "开始", colEnd: "结束", colProject: "项目", colProjectStart: "项目开始",
  colProjectEnd: "项目结束", colHours: "工时", colOT: "加班时数", colEarned: "所得金额",
  leaveEntitlement: "假期权益", viewHistory: "查看记录", leaveHistory: "请假记录",
  applyLeave: "申请假期", selectLeaveType: "选择假期类型", leaveType: "假期类型",
  fromDate: "开始日期（yyyy-mm-dd）", toDate: "结束日期（yyyy-mm-dd）", startDayType: "开始日",
  endDayType: "结束日", fullDay: "全天", amHalf: "上午", pmHalf: "下午", reason: "原因",
  reasonPlaceholder: "请简述原因", optional: "选填",
  uploadCert: "上传证明（必填）", replaceCert: "更换证明",
  leaveRequested: "申请天数", balanceAfter: "扣除后余额", sendRequest: "提交请假申请",
  requestSent: "申请已提交", requestSentDesc: "你的请假申请已提交审批。",
  submitAnother: "再提交一个", backHome: "返回主页", submitting: "提交中…",
  colLeaveType: "假期类型", colEntitled: "应得", colUsed: "已用", colRemaining: "剩余",
  colFrom: "开始", colTo: "结束", colDays: "天数", colStatus: "状态", colReason: "原因",
  approved: "已批准", rejected: "已拒绝", pending: "待审批", cancelled: "已取消",
  insufficientBalance: "所选日期超出剩余余额。",
  toDateBeforeFrom: "结束日期不能早于开始日期。",
  attachmentRequired: "提交前请先上传证明。",
  submitError: "提交失败，请重试。",
  pcDate: "日期", pcSupplier: "供应商", pcSelectProject: "选择项目",
  pcCurrency: "货币", pcAmount: "金额", pcAttachment: "照片/收据（必填）",
  pcAttachmentHint: "拍摄收据照片或附加文件。",
  pcAddAnother: "添加另一笔申请", pcQueued: "待提交申请", pcRemove: "移除",
  pcSubmit: "提交申请", pcSubmitAll: "提交全部申请", pcSubmitting: "提交中…",
  pcClaimSent: "申请已提交", pcClaimSentDesc: "你的零用金报销申请已提交审批。",
  pcSubmitError: "提交零用金报销申请失败，请重试。",
  pcHistory: "零用金记录", pcNoClaims: "尚未提交任何申请。",
  pcTotalClaimed: "申请总额", pcEdit: "编辑申请", pcSaveChanges: "保存更改",
  pcSaveError: "保存更改失败，请重试。", pcClaimUpdated: "申请已更新",
  pcEditUnavailable: "此申请已无法编辑。",
  pcReplaceAttachment: "更换附件", pcViewAttachment: "查看附件",
  pcRequired: "必填", pcDateRequired: "请填写日期。", pcSupplierRequired: "请填写供应商。",
  pcProjectRequired: "请选择项目。", pcAmountRequired: "请输入大于0的金额。",
  pcAttachmentRequired: "提交前请附上照片或文件。",
  pcFileTooLarge: "文件须小于10 MB。", pcFileType: "仅支持图片和PDF文件。",
  pcRejectedReason: "原因",
  lang: "English",
  gpsRequired: "打卡需要定位信息。", selectProjectFirst: "请先选择项目。",
  noSiteSaved: "此项目未保存工地位置。", mustBeWithin: "须在以内",
  detecting: "正在获取位置…", gpsDenied: "未允许定位。", withinRange: "在范围内",
  locationRecorded: "已记录位置。", clockOutHint: "你目前已打卡进入某个项目，点击下方即可下班打卡。",
  clockOutBtn: "项目下班打卡", clockInProject: "打卡进入项目", takePhoto: "拍照", chooseFile: "选择文件",
  m0: "一月", m1: "二月", m2: "三月", m3: "四月", m4: "五月", m5: "六月", m6: "七月", m7: "八月", m8: "九月", m9: "十月", m10: "十一月", m11: "十二月",
};

const dict: Record<Lang, typeof en> = { en, zh };
export type TKey = keyof typeof en;

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then((v) => {
      if (v === "en" || v === "zh") setLangState(v);
    });
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    SecureStore.setItemAsync(LANG_KEY, l).catch(() => {});
  }

  function t(k: TKey) {
    return dict[lang][k] ?? en[k] ?? k;
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT must be used inside LangProvider");
  return ctx;
}
