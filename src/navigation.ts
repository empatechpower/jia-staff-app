export type RootStackParamList = {
  Home: undefined;
  StartDay: undefined;
  RecordProject: { timesheetEntryId: string; staffId: string; activeProjectEntryId?: string };
  MyRecords: undefined;
  LeaveRequest: undefined;
  LeaveHistory: undefined;
  PettyCash: undefined;
  PettyCashHistory: undefined;
  PettyCashEdit: { claimId: string };
};
