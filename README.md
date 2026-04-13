# Paperly Studio

Premium event studio management tool for quotes, projects, payments, and finances.

Built with **React 19 + TypeScript + Tailwind CSS v4 + Supabase + Vite**.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Set up database
# Go to your Supabase project > SQL Editor
# Run the migration in supabase/migrations/001_initial_schema.sql

# 4. Start dev server
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, AppLayout, PageHeader
│   └── ui/              # Button, Modal, Toast, Input, Card, Badge, etc.
├── lib/
│   ├── auth-context.tsx  # Authentication provider
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Helpers, formatters, constants
├── pages/
│   ├── dashboard.tsx    # KPIs, active projects, tasks, payments
│   ├── quotes.tsx       # Quote builder with line items
│   ├── projects.tsx     # Pipeline view with search & filters
│   ├── finance.tsx      # Revenue, expenses, monthly breakdown
│   ├── tasks.tsx        # Task management
│   ├── expenses.tsx     # Expense tracking
│   ├── catalog.tsx      # Article pricing catalog
│   ├── suppliers.tsx    # Supplier directory
│   ├── settings.tsx     # Studio configuration
│   └── login.tsx        # Auth page
├── types/
│   └── database.ts      # TypeScript types for all entities
├── App.tsx              # Routing and app shell
├── main.tsx             # Entry point
└── index.css            # Tailwind + custom theme
```

## Deploying to Netlify

1. Connect this repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The `netlify.toml` is already configured for SPA routing.
