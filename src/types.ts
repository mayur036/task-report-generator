export type WorkMode = 'In Office' | 'WFH';

export interface Task {
  id: string;
  description: string;
  time: string; // ETA for In Time, Actual for Out Time
}

export interface ReportData {
  date: Date;
  workMode: WorkMode;
  inTime: string;
  outTime: string;
  projectName: string;
  tasks: Task[];
}
