'use client';

import { useState, useEffect } from 'react';
import { aggregateByUser, aggregateByEnvironment } from '@/lib/aggregation';
import { UsageRecord, Member, UserUsage, EnvironmentUsage, GroupBy } from '@/lib/types';

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | '6m' | '12m' | 'custom';

interface CacheEntry {
  usageRecords: UsageRecord[];
  members: Member[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
      const orgId = process.env.NEXT_PUBLIC_ONA_ORGANIZATION_ID || '';
      
      const cacheKey = `${startTime}-${endTime}-${orgId}`;
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

      if (orgId) {
        params.append('organizationId', orgId);
      }

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white', color: 'black', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
          Ona Environment Usage Dashboard
        </h1>

        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '1.5rem', 
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['today', 'yesterday', '7d', '30d', '6m', '12m', 'custom'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: dateRange === range ? '2px solid #1F53FF' : '1px solid #ccc',
                    backgroundColor: dateRange === range ? '#1F53FF' : 'white',
                    color: dateRange === range ? 'white' : 'black',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: dateRange === range ? '600' : '400',
                  }}
                >
                  {range === '7d' ? '7 Days' : 
                   range === '30d' ? '30 Days' : 
                   range === '6m' ? '6 Months' : 
                   range === '12m' ? '12 Months' : 
                   range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Group By
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setGroupBy('user')}
                style={{
                  padding: '0.5rem 1rem',
                  border: groupBy === 'user' ? '2px solid #1EA41D' : '1px solid #ccc',
                  backgroundColor: groupBy === 'user' ? '#1EA41D' : 'white',
                  color: groupBy === 'user' ? 'white' : 'black',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: groupBy === 'user' ? '600' : '400',
                }}
              >
                User
              </button>
              <button
                onClick={() => setGroupBy('environment')}
                style={{
                  padding: '0.5rem 1rem',
                  border: groupBy === 'environment' ? '2px solid #1EA41D' : '1px solid #ccc',
                  backgroundColor: groupBy === 'environment' ? '#1EA41D' : 'white',
                  color: groupBy === 'environment' ? 'white' : 'black',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: groupBy === 'environment' ? '600' : '400',
                }}
              >
                Environment
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading usage data...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            padding: '1rem', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#c00' }}>Error: {error}</p>
          </div>
        )}

        {!loading && !error && usageRecords.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No usage data found for the selected date range.</p>
          </div>
        )}

        {!loading && !error && usageRecords.length > 0 && (
          <div style={{ 
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {groupBy === 'user' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Total Hours</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Environments</th>
                  </tr>
                </thead>
                <tbody>
                  {userUsages.map((user) => (
                    <>
                      <tr 
                        key={user.userId}
                        style={{ 
                          borderBottom: '1px solid #e0e0e0',
                          cursor: 'pointer',
                          backgroundColor: expandedRows.has(user.userId) ? '#f9f9f9' : 'white'
                        }}
                        onClick={() => toggleRow(user.userId)}
                      >
                        <td style={{ padding: '1rem' }}>{user.userName}</td>
                        <td style={{ padding: '1rem' }}>{user.email}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                          {formatHours(user.totalHours)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ 
                            backgroundColor: '#1F53FF',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.875rem'
                          }}>
                            {user.environments.length}
                          </span>
                        </td>
                      </tr>
                      {expandedRows.has(user.userId) && (
                        <tr>
                          <td colSpan={4} style={{ padding: '0', backgroundColor: '#fafafa' }}>
                            <div style={{ padding: '1rem', paddingLeft: '3rem' }}>
                              <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Environments:</h4>
                              {user.environments.map((env) => (
                                <div 
                                  key={env.environmentId}
                                  style={{ 
                                    marginBottom: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                      {env.environmentId}
                                    </span>
                                    <span style={{ fontWeight: '600' }}>
                                      {formatHours(env.totalHours)} hours
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Environment ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Total Hours</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {envUsages.map((env) => {
                    const rowKey = `${env.environmentId}-${env.userId}`;
                    return (
                      <>
                        <tr 
                          key={rowKey}
                          style={{ 
                            borderBottom: '1px solid #e0e0e0',
                            cursor: 'pointer',
                            backgroundColor: expandedRows.has(rowKey) ? '#f9f9f9' : 'white'
                          }}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {env.environmentId}
                          </td>
                          <td style={{ padding: '1rem' }}>{env.userName}</td>
                          <td style={{ padding: '1rem' }}>{env.email}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                            {formatHours(env.totalHours)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{ 
                              backgroundColor: '#1EA41D',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.875rem'
                            }}>
                              {env.sessions.length}
                            </span>
                          </td>
                        </tr>
                        {expandedRows.has(rowKey) && (
                          <tr>
                            <td colSpan={5} style={{ padding: '0', backgroundColor: '#fafafa' }}>
                              <div style={{ padding: '1rem', paddingLeft: '3rem' }}>
                                <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Sessions:</h4>
                                {env.sessions.map((session, idx) => (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      marginBottom: '0.5rem',
                                      padding: '0.5rem',
                                      backgroundColor: 'white',
                                      borderRadius: '4px',
                                      border: '1px solid #e0e0e0',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                      <span>Start: {formatDate(session.startTime)}</span>
                                      <span style={{ fontWeight: '600' }}>
                                        {formatHours(session.durationHours)} hours
                                      </span>
                                    </div>
                                    <div>End: {formatDate(session.endTime)}</div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
