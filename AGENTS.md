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

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

# Form development

Stack: react-hook-form + @hookform/resolvers + zod (v4). Validation schemas
derive from Drizzle tables with drizzle-zod. Reference implementation:
`db/validation.ts` + `actions/bot.ts` + `components/bot-dialog.tsx`.

- Schemas live in `db/validation.ts` and import the table from `@/db/schema`,
  never from `@/db` — the pg pool must not reach client bundles.
- `createInsertSchema(table, { refinements })` is the server insert schema.
  Derive the client form schema with `.omit({ id: true, userId: true,
  createdAt: true })` — identity, ownership, and timestamps are server-owned;
  never accept them from the client.
- Server Actions live in `actions/` with `"use server"`. Call `await auth()`
  from `@clerk/nextjs/server` first and take `userId` from the session, never
  from input. Validate with `safeParse`; return a discriminated result
  (`{ success: true } | { success: false; error }`) instead of throwing. Call
  `revalidatePath` after successful mutations.
- Client forms use `useForm` + `zodResolver`, typed with `z.infer`. Compose
  with the shadcn `Field` primitives (`FieldGroup`/`Field`/`FieldLabel`/
  `FieldDescription`/`FieldError`) — never raw `div` + `space-y-*`.
- Validation state: `data-invalid` on the `Field`, `aria-invalid` on the
  control, `<FieldError>` rendered only when the message is a truthy string
  (zod messages are `string | undefined`).
- Submit button has no `isPending` prop: use
  `disabled={form.formState.isSubmitting}` plus
  `{isSubmitting && <Spinner data-icon="inline-start" />}`.
- Feedback goes through the global Base UI toast:
  `toast.add({ title, description })` from `@/components/ui/toast` (the
  `<Toaster />` is mounted in `app/layout.tsx`).
- Dialog forms use `@/components/ui/dialog` with `DialogTrigger render={<...>}`.
  This is a Base UI project — `asChild` does not exist. Reset the form after
  successful submit, not on close, so drafts survive an accidental dismissal.
- Preset options that fill a field call
  `form.setValue(field, value, { shouldValidate: true })`.
- Columns with app-generated defaults (e.g. `avatar` via `$defaultFn`) stay
  optional in the schema: supply them in `defaultValues` and treat `watch()`
  results as possibly undefined.
- If installing `@hookform/resolvers` fails on an `@typeschema` peer conflict,
  retry with `--legacy-peer-deps`; the conflicting integration is never used.
