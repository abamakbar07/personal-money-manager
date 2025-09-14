# Personal Money Manager

A simple personal finance manager built with Next.js and PostgreSQL.

## Setup

1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Run the SQL scripts in the `scripts/` directory to set up the database schema.
3. Start the development server:
   ```sh
   pnpm dev
   ```

## Monthly Start Day

User settings now include a **Monthly Start Day** (1‑31) that defaults to `1`. This value controls how "This Month" ranges are calculated across overviews, budgets and data exports. You can configure it from **Settings → General** in the application.
