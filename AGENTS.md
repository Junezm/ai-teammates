<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Development project: no backwards compatibility

This is a development project. There is no backwards compatibility and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

# Database workflow: push only, never migrations

Schema changes to `db/schema.ts` are applied with `npm run db:push` (`drizzle-kit push`) only.

- NEVER run `drizzle-kit generate`, `drizzle-kit migrate`, or `drizzle-kit check`, and never create `drizzle/` migration files or snapshots.
- Never re-add migration scripts (`db:generate`, `db:migrate`) to `package.json`.
- `drizzle-kit push` diffs `db/schema.ts` directly against the database (`DATABASE_URL_UNPOOLED`) and applies the change in place.
