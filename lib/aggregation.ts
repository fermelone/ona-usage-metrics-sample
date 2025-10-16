import { UsageRecord, Member, UserUsage, EnvironmentUsage, SessionInfo } from './types';

export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60);
}

export function aggregateByUser(
  records: UsageRecord[],
  members: Member[]
): UserUsage[] {
  const userMap = new Map<string, UserUsage>();
  const memberMap = new Map<string, Member>();

  members.forEach(member => {
    memberMap.set(member.userId, member);
  });

  records.forEach(record => {
    if (!record.userId || !record.createdAt || !record.stoppedAt || !record.environmentId) {
      return;
    }

    const member = memberMap.get(record.userId);
    const userName = member?.fullName || record.userId;
    const email = member?.email || '';

    if (!userMap.has(record.userId)) {
      userMap.set(record.userId, {
        userId: record.userId,
        userName,
        email,
        totalHours: 0,
        environments: [],
      });
    }

    const userUsage = userMap.get(record.userId)!;
    const durationHours = calculateDurationHours(record.createdAt, record.stoppedAt);
    userUsage.totalHours += durationHours;

    let envUsage = userUsage.environments.find(e => e.environmentId === record.environmentId);
    if (!envUsage) {
      envUsage = {
        environmentId: record.environmentId,
        userId: record.userId,
        userName,
        email,
        totalHours: 0,
        sessions: [],
      };
      userUsage.environments.push(envUsage);
    }

    envUsage.totalHours += durationHours;
    envUsage.sessions.push({
      startTime: record.createdAt,
      endTime: record.stoppedAt,
      durationHours,
    });
  });

  return Array.from(userMap.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export function aggregateByEnvironment(
  records: UsageRecord[],
  members: Member[]
): EnvironmentUsage[] {
  const envMap = new Map<string, EnvironmentUsage>();
  const memberMap = new Map<string, Member>();

  members.forEach(member => {
    memberMap.set(member.userId, member);
  });

  records.forEach(record => {
    if (!record.userId || !record.createdAt || !record.stoppedAt || !record.environmentId) {
      return;
    }

    const member = memberMap.get(record.userId);
    const userName = member?.fullName || record.userId;
    const email = member?.email || '';

    const key = `${record.environmentId}-${record.userId}`;
    
    if (!envMap.has(key)) {
      envMap.set(key, {
        environmentId: record.environmentId,
        userId: record.userId,
        userName,
        email,
        totalHours: 0,
        sessions: [],
      });
    }

    const envUsage = envMap.get(key)!;
    const durationHours = calculateDurationHours(record.createdAt, record.stoppedAt);
    envUsage.totalHours += durationHours;
    envUsage.sessions.push({
      startTime: record.createdAt,
      endTime: record.stoppedAt,
      durationHours,
    });
  });

  return Array.from(envMap.values()).sort((a, b) => b.totalHours - a.totalHours);
}
