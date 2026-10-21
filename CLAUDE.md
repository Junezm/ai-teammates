# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # next dev (dev indicator disabled in next.config.ts)
npm run build        # next build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write over ts/tsx

npm run db:push      # apply db/schema.ts to the database (drizzle-kit push)
npm run db:studio    # drizzle studio
```

- No test suite exists. Verification means `npm run typecheck` + `npm run lint` + the app actually running.
- `drizzle-kit push` uses `DATABASE_URL_UNPOOLED` (direct Neon connection), read from `.env.local`. Application code connects with the pooled `DATABASE_URL` (PgBouncer).

## Architecture

AI teammates app: users create bots (DiceBear avatars), each bot starts a direct chat, chats have bot members.

- **Data** — `db/schema.ts` (Drizzle): `bots` → `chat_members` ← `chats`, all keyed to the Clerk `userId` string (Clerk is the only auth; there is no user table). Query helpers live in `queries/` (e.g. `listUserChats` for the sidebar); they call `auth()` and return empty for signed-out users.
- **Mutations** — `actions/bot.ts`: the pattern for all Server Actions. `createBot` inserts a bot + a direct chat + a chat-member row in one transaction, wraps errors in a discriminated result, and calls `revalidatePath("/", "layout")` so the sidebar (fetched by `app/(dashboard)/layout.tsx`) refreshes.
- **Routes** — `app/(dashboard)/` is protected via `auth.protect()` in the page; Clerk middleware (`proxy.ts`) guards everything else. `app/sign-in/[[...sign-in]]` and `app/sign-up` host the Clerk mount points referenced by `.env.local` route variables.
- **UI stack** — Next.js 16 App Router + React 19, shadcn "base-nova" style on **Base UI** (not Radix — no `asChild`; use `render={<...>}`), Tailwind v4. Components in `components/ui/`.
- **Avatars** — `components/chat-avatar.tsx` builds DiceBear `gaze` avatars server-side via `@dicebear/core` and renders them as `data:` URIs with `next/image` (`unoptimized`).

## Deployment

Railway ("ai-teammates" service), deploying from this GitHub repo. `railway-env.sh` syncs Clerk/Neon env vars from `.env.local` to the service.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.claude/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-tasks`.
<!-- TRIGGER.DEV SKILLS END -->
