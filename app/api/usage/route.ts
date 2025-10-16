import { NextRequest, NextResponse } from 'next/server';
import Gitpod from '@gitpod/sdk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const organizationId = searchParams.get('organizationId');

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }

    const pat = process.env.ONA_PAT;
    if (!pat) {
      return NextResponse.json(
        { error: 'ONA_PAT environment variable is not set' },
        { status: 500 }
      );
    }

    const client = new Gitpod({
      bearerToken: pat,
    });

    const usageRecords = [];
    for await (const record of client.usage.listEnvironmentRuntimeRecords({
      filter: {
        dateRange: {
          startTime,
          endTime,
        },
      },
      pagination: {
        pageSize: 100,
      },
    })) {
      usageRecords.push(record);
    }

    let members: any[] = [];
    if (organizationId) {
      try {
        for await (const member of client.organizations.listMembers({
          organizationId,
          pagination: {
            pageSize: 100,
          },
        })) {
          members.push(member);
        }
      } catch (error) {
        console.error('Error fetching organization members:', error);
      }
    }

    return NextResponse.json({
      usageRecords,
      members,
    });
  } catch (error: any) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
