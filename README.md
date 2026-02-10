# Ona Usage Metrics Dashboard

A Next.js dashboard for tracking environment usage across your Ona (formerly Gitpod) organization.

## Features

- **Date Range Selection**: View usage for today, yesterday, 7 days, 30 days, 6 months, 12 months, or a custom date range
- **Flexible Grouping**: Group usage data by user, environment, or project
- **Detailed Breakdown**: Expand rows to see individual environments per user, sessions per environment, or users/environments per project
- **Manual Refresh**: Force refresh button to bypass cache and fetch latest data
- **Smart Caching**: Reduces unnecessary API calls by caching responses for 5 minutes
- **Permission Handling**: Gracefully handles projects with restricted access
- **Clean UI**: Simple white background with black text and accent colors (#1F53FF, #1EA41D, #FF8A00)

<p align="center">
<img width="800" alt="image" src="https://github.com/user-attachments/assets/ea7f88e2-0093-4596-b425-a116675df1b1" />
</p>

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your Ona PAT**:
   - Get your Personal Access Token from [https://app.gitpod.io/settings/personal-access-tokens](https://app.gitpod.io/settings/personal-access-tokens)
   - Rename `.env.example` to `.env.local` and add your PAT and Org ID:
     ```
     ONA_PAT=your_personal_access_token_here
     ONA_ORGANIZATION_ID=your_organization_id_here
     ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the dashboard**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

### Data Aggregation

The dashboard fetches environment usage records from the Ona API and aggregates them in three ways:

1. **By User**: Shows total hours per user with expandable rows to see individual environments
2. **By Environment**: Shows total hours per environment ID with expandable rows to see individual sessions
3. **By Project**: Shows total hours per project with expandable rows to see users and environments within each project

### Usage Calculation

Usage hours are calculated from the `createdAt` (start time) to `stoppedAt` (end time) of each environment session. Multiple sessions for the same environment are summed together.

### Caching

To prevent unnecessary API calls:
- Responses are cached for 5 minutes based on the date range and organization ID
- Switching between grouping modes (User, Environment, Project) uses cached data
- Changing the date range triggers a new API call
- Use the Refresh button to bypass cache and fetch the latest data immediately

### Project Name Resolution

The dashboard attempts to fetch project names for better readability:
- Projects with accessible metadata display their configured name
- Projects without access show as "Restricted Project" with a shortened ID
- The special null UUID shows as "No Project"
- Full project IDs are always visible in the expandable details section

## API Reference

The SDK API reference is available in `SDK_API_REFERENCE.md` for detailed information about available endpoints and data structures.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── usage/
│   │       └── route.ts          # API route for fetching usage data
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main dashboard component
├── lib/
│   ├── aggregation.ts            # Data aggregation logic
│   └── types.ts                  # TypeScript type definitions
├── .env.local                    # Environment variables (git-ignored)
├── .env.example                  # Example environment variables
└── SDK_API_REFERENCE.md          # Ona SDK API reference
```

## Technologies

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **@gitpod/sdk**: Official Ona TypeScript SDK
- **React**: UI library
Example of how to use Ona's API to collect usage metrics
