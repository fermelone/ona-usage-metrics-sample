export interface UsageRecord {
  id?: string;
  createdAt?: string;
  environmentClassId?: string;
  environmentId?: string;
  projectId?: string;
  runnerId?: string;
  stoppedAt?: string;
  userId?: string;
}

export interface Member {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface UserUsage {
  userId: string;
  userName: string;
  email: string;
  totalHours: number;
  environments: EnvironmentUsage[];
}

export interface EnvironmentUsage {
  environmentId: string;
  userId: string;
  userName: string;
  email: string;
  totalHours: number;
  sessions: SessionInfo[];
}

export interface SessionInfo {
  startTime: string;
  endTime: string;
  durationHours: number;
}

export type GroupBy = 'user' | 'environment';
