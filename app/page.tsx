'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { aggregateByUser, aggregateByEnvironment } from '@/lib/aggregation';
import { UsageRecord, Member, UserUsage, EnvironmentUsage, GroupBy } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | '6m' | '12m' | 'custom';

interface CacheEntry {
  usageRecords: UsageRecord[];
  members: Member[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000;

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userUsages, setUserUsages] = useState<UserUsage[]>([]);
  const [envUsages, setEnvUsages] = useState<EnvironmentUsage[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());

  const getDateRangeValues = (): { startTime: string; endTime: string } => {
    const now = new Date();
    const endTime = now.toISOString();
    let startTime: string;

    switch (dateRange) {
      case 'today':
        startTime = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        startTime = yesterday.toISOString();
        break;
      case '7d':
        startTime = new Date(now.setDate(now.getDate() - 7)).toISOString();
        break;
      case '30d':
        startTime = new Date(now.setDate(now.getDate() - 30)).toISOString();
        break;
      case '6m':
        startTime = new Date(now.setMonth(now.getMonth() - 6)).toISOString();
        break;
      case '12m':
        startTime = new Date(now.setMonth(now.getMonth() - 12)).toISOString();
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom date range requires both start and end dates');
        }
        startTime = new Date(customStartDate).toISOString();
        return {
          startTime,
          endTime: new Date(customEndDate).toISOString(),
        };
      default:
        startTime = new Date(now.setDate(now.getDate() - 7)).toISOString();
    }

    return { startTime, endTime };
  };

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startTime, endTime } = getDateRangeValues();
      
      const cacheKey = `${startTime}-${endTime}`;
      const cachedData = cache.get(cacheKey);
      const now = Date.now();

      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        setUsageRecords(cachedData.usageRecords);
        setMembers(cachedData.members);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        startTime,
        endTime,
      });

      const response = await fetch(`/api/usage?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch usage data');
      }

      const data = await response.json();
      setUsageRecords(data.usageRecords);
      setMembers(data.members);

      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        usageRecords: data.usageRecords,
        members: data.members,
        timestamp: now,
      });
      setCache(newCache);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange !== 'custom' || (customStartDate && customEndDate)) {
      fetchUsageData();
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (usageRecords.length > 0) {
      if (groupBy === 'user') {
        setUserUsages(aggregateByUser(usageRecords, members));
      } else {
        setEnvUsages(aggregateByEnvironment(usageRecords, members));
      }
    }
  }, [usageRecords, members, groupBy]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '6m', label: '6 Months' },
    { value: '12m', label: '12 Months' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ona Usage Metrics</h1>
          <p className="text-muted-foreground mt-2">
            Track environment usage across your organization
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select date range and grouping options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex flex-wrap gap-2">
                {dateRangeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={dateRange === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium">Group By</label>
              <div className="flex gap-2">
                <Button
                  variant={groupBy === 'user' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setGroupBy('user')}
                >
                  User
                </Button>
                <Button
                  variant={groupBy === 'environment' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setGroupBy('environment')}
                >
                  Environment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading usage data...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-900">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && usageRecords.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No usage data found for the selected date range.
            </CardContent>
          </Card>
        )}

        {!loading && !error && usageRecords.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {groupBy === 'user' ? (
                    <>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-center">Environments</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Environment ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-center">Sessions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupBy === 'user' ? (
                  userUsages.map((user) => (
                    <>
                      <TableRow
                        key={user.userId}
                        className="cursor-pointer"
                        onClick={() => toggleRow(user.userId)}
                      >
                        <TableCell>
                          {expandedRows.has(user.userId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{user.userName}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatHours(user.totalHours)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default">{user.environments.length}</Badge>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(user.userId) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4 pl-12 space-y-2">
                              <p className="text-sm font-medium mb-3">Environments</p>
                              {user.environments.map((env) => (
                                <div
                                  key={env.environmentId}
                                  className="flex items-center justify-between rounded-md border bg-background p-3 text-sm"
                                >
                                  <code className="text-xs text-muted-foreground">
                                    {env.environmentId}
                                  </code>
                                  <span className="font-medium">
                                    {formatHours(env.totalHours)} hours
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : (
                  envUsages.map((env) => {
                    const rowKey = `${env.environmentId}-${env.userId}`;
                    return (
                      <>
                        <TableRow
                          key={rowKey}
                          className="cursor-pointer"
                          onClick={() => toggleRow(rowKey)}
                        >
                          <TableCell>
                            {expandedRows.has(rowKey) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{env.environmentId}</code>
                          </TableCell>
                          <TableCell className="font-medium">{env.userName}</TableCell>
                          <TableCell className="text-muted-foreground">{env.email}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatHours(env.totalHours)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{env.sessions.length}</Badge>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(rowKey) && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <div className="p-4 pl-12 space-y-2">
                                <p className="text-sm font-medium mb-3">Sessions</p>
                                {env.sessions.map((session, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-md border bg-background p-3 text-sm space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        {formatDate(session.startTime)}
                                      </span>
                                      <span className="font-medium">
                                        {formatHours(session.durationHours)} hours
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      End: {formatDate(session.endTime)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
