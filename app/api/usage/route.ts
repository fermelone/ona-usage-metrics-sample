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
    const orgId = organizationId || process.env.ONA_ORGANIZATION_ID;
    if (orgId) {
      try {
        for await (const member of client.organizations.listMembers({
          organizationId: orgId,
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

    const projectIds = new Set<string>();
    usageRecords.forEach((record: any) => {
      if (record.projectId) {
        projectIds.add(record.projectId);
      }
    });

    const projectMap = new Map<string, string>();
    if (projectIds.size > 0) {
      try {
        // Use API filter to fetch only the projects we need (prevents timeout with large orgs)
        for await (const project of client.projects.list({
          filter: {
            projectIds: Array.from(projectIds),
          },
          pagination: {
            pageSize: 100,
          },
        })) {
          if (project.id) {
            // Use project name if available, otherwise use the project ID
            const projectName = project.metadata?.name?.trim();
            projectMap.set(project.id, projectName || project.id);
          }
        }
        
        // For projects not found in list, try to retrieve individually
        const missingProjectIds = Array.from(projectIds).filter(id => !projectMap.has(id));
        
        for (const projectId of missingProjectIds) {
          // Handle special null UUID case
          if (projectId === '00000000-0000-0000-0000-000000000000') {
            projectMap.set(projectId, 'No Project');
            continue;
          }

          // Try to retrieve individual project details
          try {
            const projectResponse = await client.projects.retrieve({ projectId });
            const projectName = projectResponse.project?.metadata?.name?.trim();
            if (projectName) {
              projectMap.set(projectId, projectName);
            } else {
              // Project exists but has no name
              const shortId = projectId.substring(0, 8);
              projectMap.set(projectId, `Unnamed Project (${shortId}...)`);
            }
          } catch (retrieveError: any) {
            // Handle different error scenarios
            const shortId = projectId.substring(0, 8);
            console.log(`Error retrieving project ${projectId}:`, {
              status: retrieveError.status,
              code: retrieveError.code,
              message: retrieveError.message
            });
            
            if (retrieveError.status === 403 || retrieveError.code === 'permission_denied') {
              // Service account doesn't have permission to access this project
              projectMap.set(projectId, `Restricted Project (${shortId}...)`);
            } else if (retrieveError.status === 404 || retrieveError.code === 'not_found') {
              // Project doesn't exist
              projectMap.set(projectId, `Unknown Project (${shortId}...)`);
            } else {
              // Other errors - show as inaccessible
              projectMap.set(projectId, `Inaccessible Project (${shortId}...)`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        // If list fails entirely, mark all projects as inaccessible
        projectIds.forEach(id => {
          if (!projectMap.has(id)) {
            const shortId = id.substring(0, 8);
            projectMap.set(id, `Inaccessible Project (${shortId}...)`);
          }
        });
      }
    }

    const enrichedRecords = usageRecords.map((record: any) => ({
      ...record,
      projectName: record.projectId ? projectMap.get(record.projectId) : undefined,
    }));

    return NextResponse.json({
      usageRecords: enrichedRecords,
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
