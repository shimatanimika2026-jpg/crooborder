# Database Deployment Guide

Last updated: 2026-04-28

This project uses Supabase as the production database. Local Demo mode can run without Supabase, but production login, persistence, dashboards, RPC actions, receiving, IQC, shipment, and commission workflows require a real Supabase project.

## Production Database Order

1. Create a new Supabase project.
2. Open Supabase SQL Editor.
3. Run the schema SQL in this order:
   - `00000_baseline_schema.sql`
   - every file in `supabase/migrations/`, sorted by file name ascending
4. Load demo/UAT data only when needed:
   - full demo data: `supabase/seed/demo_seed_full.sql`
   - lightweight seed set: `seeds/01_base_data.sql`, then `seeds/02_test_data.sql`
5. Create or verify UAT accounts:
   - `SQL_创建UAT测试账号.sql`
   - `SQL_验证UAT测试账号.sql`
6. Configure frontend environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Run local real-mode verification:
   - `pnpm verify:database`
   - `pnpm test:mvp`
   - `pnpm deliver`

## Contract Check

Run:

```bash
pnpm verify:database
```

The check verifies that frontend `.rpc('...')` calls and `.from('...')` table/view references have matching SQL definitions in `00000_baseline_schema.sql` or `supabase/migrations/*.sql`.

Duplicate migration number prefixes are reported as warnings. They are currently tolerated because the full file name sort order is deterministic, but new migrations should use a unique numeric prefix.

## Known Migration Prefix Warnings

The current codebase contains these duplicate numeric prefixes:

- `00064`
- `00090`
- `00091`
- `00120`
- `00125`

Do not add new duplicate prefixes. Use the next unused number.

## Production Readiness Rule

The app is not production-ready until all of these are true:

- SQL schema and migrations have been applied to Supabase without errors.
- `pnpm verify:database` passes.
- `.env` contains real Supabase values.
- Login works against the real Supabase project.
- Commission create/detail/actions persist in `commissions` and `commission_operations`.
- Operations dashboard RPC `get_operations_dashboard_stats` returns data.
- `pnpm deliver` passes and the package is generated from `export/`.
