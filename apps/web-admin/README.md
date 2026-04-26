# web-admin

Next.js 14 App Router dashboard serving Admins and Employees across all 5 facility types (Hospital, Hotel, School, College, Factory).

## Routes

- `/admin/*` — facility admin dashboards (overview, incidents, staff, facility config, mesh, playbooks, analytics)
- `/employee/*` — mobile-first staff UI (home, tasks, chat, drill mode)
- `/community/*` — community member UI (SOS, navigate, contacts, check-in)
- `/map` — community-wide facility map
- `/admin/mesh/live` — flagship live mesh visualization

## Build from Antigravity Prompts

Start with **Prompt 0.1**, then **Prompt 1.2** (auth), then Prompts **1.3 / 1.4 / 1.5** in parallel.

## Dev

```bash
pnpm dev
```
