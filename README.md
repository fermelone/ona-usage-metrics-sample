# Ona Usage Metrics Dashboard

A Next.js dashboard for tracking environment usage across your Ona (formerly Gitpod) organization.

## Features

- **Date Range Selection**: View usage for today, yesterday, 7 days, 30 days, 6 months, 12 months, or a custom date range
- **Flexible Grouping**: Group usage data by user or by environment ID
- **Detailed Breakdown**: Expand rows to see individual environments per user or sessions per environment
- **Smart Caching**: Reduces unnecessary API calls by caching responses for 5 minutes
- **Clean UI**: Simple white background with black text and accent colors (#1F53FF and #1EA41D)

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

The dashboard fetches environment usage records from the Ona API and aggregates them in two ways:

1. **By User**: Shows total hours per user with expandable rows to see individual environments
2. **By Environment**: Shows total hours per environment ID with expandable rows to see individual sessions

### Usage Calculation

Usage hours are calculated from the `createdAt` (start time) to `stoppedAt` (end time) of each environment session. Multiple sessions for the same environment are summed together.

### Caching

To prevent unnecessary API calls:
- Responses are cached for 5 minutes based on the date range and organization ID
- Switching between "Group by User" and "Group by Environment" uses cached data
- Only changing the date range triggers a new API call

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
