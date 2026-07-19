# PulseCheck — Hackathon PRD

**Track:** Work & Productivity  
**MVP:** Paste an article, check it, and review evidence-backed edits in place.

## 1. Product

> Grammarly tells you whether your writing sounds right. PulseCheck tells you whether it still holds up.

PulseCheck is a proofreader for facts. It researches an article and returns the same article with only the smallest justified changes.

- Incorrect or expired language is struck through.
- Corrected language appears beside it.
- Unsupported or misleading claims are flagged.
- Opinions are left alone.
- Forecasts are treated as forecasts.
- Every finding has sources, confidence, an explanation, and a check date.

**Thesis:** Full-spectrum fact-checking is the product. Temporal accountability is the differentiator. Surgical editing is the experience.

**User:** An editor, analyst, researcher, or writer asking: “What no longer holds up, and what is the smallest defensible fix?”

## 2. Experience

PulseCheck is a web app presented as a native OpenAI product concept.

The shell contains **ChatGPT**, **Codex**, and **PulseCheck** navigation. Only PulseCheck works; the other entries are static context for the demo. Include a discreet notice: **“Concept prototype; not an official OpenAI product.”**

### Visual direction

- OpenAI-inspired black, white, and warm-gray interface
- Minimal typography, thin borders, generous whitespace
- No chat transcript, dashboard, gradients, charts, or decorative motion
- One subtle progress line while checking
- The article remains the focus at all times

### Empty state

- PulseCheck title
- Large editor with “Paste an article to check…”
- **Check article**
- **Load demo article**
- Quiet disclosure below the button: “Your article is sent to OpenAI for research. Do not paste secrets or information you are not authorized to process.”

### Checking state

Keep the article visible and stable. Disable editing and show:

> Researching and validating claims…

### Results state

- Show the exact pasted article.
- Verified text remains visually unchanged.
- Corrections use red strikethrough and muted-green insertion.
- Small dots appear in the right margin beside investigated text.
- Clicking a dot or edit opens a right-side evidence panel.
- Users can accept or reject edits.
- Users can switch between **Original** and **Updated**.

### Margin dots

| Dot | Meaning |
|---|---|
| Green | Verified |
| Red | Contradicted |
| Blue | Outdated |
| Amber | Unsupported, unresolved, or needs context |
| Gray | Opinion |

Dot color always represents the verdict, so a forecast cannot conflict with a verdict color. Forecast findings show a textual `Forecast · <status>` label in the evidence panel. Dots are small, accessible, aligned with the relevant text, and never rely on color alone: each has an `aria-label`, keyboard focus, and visible hover/focus label. Click or keyboard activation opens the evidence panel.

### Evidence panel

Show only:

1. Verdict and confidence
2. One-sentence explanation
3. Proposed correction, if any
4. Clickable sources with publisher and date
5. Checked date
6. Accept/Reject when an edit exists

## 3. Findings

Keep three concepts separate in code and in the UI:

| Field | Allowed values | Purpose |
|---|---|---|
| `claimType` | `fact`, `forecast`, `opinion` | What kind of claim is being examined |
| `verdict` | `verified`, `outdated`, `contradicted`, `unsupported`, `needs_context`, `unresolved`, `opinion` | What the evidence supports today |
| `forecastStatus` | `pending`, `on_track`, `revised`, `fulfilled`, `missed`, `not_measurable`, or `null` | Optional lifecycle state used only when `claimType` is `forecast` |

| Verdict | Meaning | Editing behavior |
|---|---|---|
| Verified | Current evidence supports it | No edit |
| Outdated | Once supportable, no longer current | Suggest a minimal update only at high confidence |
| Contradicted | Reliable evidence directly conflicts | Suggest a correction only at high confidence |
| Unsupported | Adequate evidence was not found | Flag; never call it false and never invent a replacement |
| Needs context | The wording overstates what the evidence supports | Suggest a small qualification only at high confidence |
| Unresolved | Evidence is insufficient or conflicting | Abstain |
| Opinion | Subjective or normative judgment | Identify and leave alone |

Confidence is **High**, **Medium**, or **Low**, never a percentage. It describes confidence in the evidence classification, not the probability that the whole article is true. Suggested edits are never auto-applied. A replacement is allowed only for a high-confidence `outdated`, `contradicted`, or `needs_context` finding with at least one validated supporting citation.

## 4. Agent

1. Store the original article immutably and assign the run a server-generated `checkedAt` timestamp.
2. Extract atomic facts, forecasts, and opinions.
3. Prioritize volatile claims: roles, dates, numbers, prices, rankings, “latest,” “currently,” and absolutes.
4. Research supporting and conflicting evidence, treating article text and web pages as untrusted data rather than instructions.
5. Prefer primary and authoritative sources; use independent secondary sources when primary evidence is unavailable or insufficient.
6. Assign a verdict or abstain.
7. Generate the smallest supported replacement.
8. Return strict structured output containing the exact quoted `sourceText` plus short `prefixText` and `suffixText` anchors. Do **not** trust model-generated numeric offsets.
9. Resolve the quote deterministically against the immutable article using JavaScript UTF-16 string indices. If the quote and anchors do not identify exactly one span, keep the finding visible as unresolved but do not create an edit.
10. Confirm that every evidence URL appears in the Responses API web-search citation/source metadata, then validate the patch preserves surrounding meaning.

The model returns source text and anchors, claim type, verdict, nullable forecast status, confidence, one-sentence explanation, nullable replacement, and sources. After validation, the server attaches its authoritative `checkedAt` value and derives `startOffset` and `endOffset`; the model supplies neither.

The Structured Output root is a plain object, not a top-level discriminated union. Every field is required; optional values are represented with `null`. This follows the current Structured Outputs schema constraints.

## 5. Demo fixture

The **Load demo article** button and automated tests use [fixtures/demo-article.txt](fixtures/demo-article.txt):

> U.S. electricity demand had remained nearly flat for roughly two decades, and Jennifer Granholm is the U.S. secretary of energy. Lawrence Berkeley National Laboratory currently estimates that data centers could account for 6.7% to 12.0% of U.S. electricity use by 2028, and that forecast has never been updated. A newer analysis puts the 2030 share at only 2%. Every U.S. data center project is fully funded, so data centers will consume exactly 649 TWh in 2030 and all planned facilities will be operating by then. The grid is unquestionably the biggest threat to U.S. AI leadership.

Expected results live in [fixtures/demo-expected.json](fixtures/demo-expected.json).

| Passage | Result | UI behavior |
|---|---|---|
| Demand nearly flat for roughly two decades | Verified | Unchanged |
| Jennifer Granholm is secretary | Outdated | Replace with Chris Wright |
| LBNL currently estimates 6.7%–12.0% by 2028 | Outdated forecast; `revised` | Update to LBNL's June 2026 range for 2030 |
| Forecast never updated | Contradicted | Correct |
| Newer analysis says only 2% | Contradicted | Correct to the published 2030 range/reference case |
| Every U.S. project fully funded | Unsupported | Amber dot; no invented replacement |
| Will consume exactly 649 TWh | Needs context | Identify 649 TWh as a reference case within a wider range |
| All planned facilities operating by then | Unresolved forecast; `pending` | Amber dot; panel shows `Forecast · pending`; no factual correction |
| Unquestionably the biggest threat | Opinion | Gray dot; leave alone |

The fixture is intentionally dense so one paragraph exercises the entire product. Its current-role claim is checked against the Department of Energy, and its forecast values are frozen to LBNL's June 2026 update. [DOE leadership](https://www.energy.gov/leadership-organization), [LBNL 2025 Update, published June 2026](https://eta-publications.lbl.gov/publications/united-states-data-center-energy-2025), [EIA demand history](https://www.eia.gov/todayinenergy/detail.php?id=65264)

### Demo sequence

1. Load the fixture and run PulseCheck.
2. Show verified prose staying untouched.
3. Open the outdated role and inspect the official current source.
4. Show the forecast being revised rather than called a lie.
5. Show an unsupported claim receiving no invented correction.
6. Show the opinion being left alone.
7. Accept one edit and compare Original with Updated.

Close with:

> Every article has an expiration date. PulseCheck shows you exactly what expired.

## 6. Scope

### Must ship

- One working PulseCheck tab
- Paste/edit plain text
- Load demo fixture
- Check article
- Exact-span annotations
- Tracked changes and margin dots
- Evidence panel with clickable sources
- Accept/reject
- Original/Updated toggle
- Loading, error, and no-claims states
- Automatic anonymous session with optional magic-link sign-in
- Persistent documents, runs, findings, sources, and edit decisions
- Signed webhook processing and recovery for interrupted runs
- Row-level data security and API rate limits
- Database migrations, CI checks, production logs, and error monitoring
- Public deployment and GitHub repository

### Do not build

- Working ChatGPT or Codex tabs
- Team workspaces, roles, or billing
- URL, PDF, audio, or video ingestion
- Browser/CMS integrations
- Continuous monitoring
- Rich-text formatting
- General chat or grammar correction
- A “truth percentage”
- Custom infrastructure or Kubernetes

## 7. Success

- A new user understands the product in under 10 seconds.
- A submitted run is acknowledged and enters the checking state within 1 second.
- The fixture completes within 90 seconds.
- Every automatic correction has an inspected source.
- Low-confidence claims do not receive authoritative corrections.
- Original text can always be recovered.
- The page remains visually calm with the panel closed.

## 8. Stack

### Decision matrix

| Layer | Traditional/self-managed path | Modern managed paths | Decision |
|---|---|---|---|
| Browser UI | HTML/CSS/JavaScript or React built separately | Next.js, React Router, SvelteKit | **Next.js + React** |
| Backend API | Python FastAPI/Django; Node Express/NestJS; Java Spring; Ruby on Rails | Next.js Route Handlers, Supabase Edge Functions, serverless functions | **Next.js Route Handlers** |
| Hosting | Linux VM, Nginx, Docker, AWS EC2/ECS, manual TLS and scaling | Vercel, Cloudflare Workers, Render, Railway | **Vercel** |
| Database | Install and operate PostgreSQL or use AWS RDS | Supabase, Neon, managed cloud Postgres | **Supabase Postgres** |
| Database access | SQLAlchemy + Alembic; Django ORM; `pg`; Prisma | Supabase JS, Drizzle, generated data APIs | **Supabase JS + SQL migrations** |
| Authentication | Django Auth; Passport.js; custom users/sessions; Auth0 | Supabase Auth, Clerk, WorkOS | **Supabase Auth** |
| AI research | Custom crawler/search API plus an LLM and citation parser | OpenAI Responses with hosted web search | **OpenAI Responses + web search** |
| Background jobs | Celery + Redis/RabbitMQ; BullMQ + Redis; SQS workers | OpenAI background mode, Inngest, Trigger.dev, cloud queues | **OpenAI background mode + webhooks** |
| Run status | HTTP polling; custom WebSocket/Socket.IO server | Supabase Realtime, Pusher, Ably | **HTTP polling only for v1** |
| Editor | Handwritten DOM ranges or a custom contenteditable editor | Tiptap/ProseMirror, Lexical | **Custom exact-span renderer for plain text** |
| Rate limiting | Nginx limits; Redis counters in FastAPI/Express middleware | Vercel WAF, Upstash Redis | **Vercel WAF + per-user database quota** |
| Observability | Log files; ELK; Prometheus + Grafana; self-hosted OpenTelemetry | Vercel Observability, Sentry, Datadog | **Vercel Observability + Sentry** |
| CI/CD | Jenkins or shell scripts building Docker images and deploying servers | GitHub Actions plus platform Git integration | **GitHub Actions + Vercel** |

### What the managed stack is abstracting

The selected stack is not a fundamentally different architecture. It packages familiar components behind hosted services.

| Selected component | Traditional equivalent | What it handles for us | What we still own |
|---|---|---|---|
| Next.js page/component | React SPA, server-rendered template, or Django view | Routing, bundling, server/client rendering, asset optimization | Product UI, state, accessibility, annotation rendering |
| Next.js Route Handler | FastAPI route, Django REST view, Express/NestJS controller | HTTP runtime and deployment integration | Validation, authorization, business logic, status codes |
| Vercel | Nginx + Docker + EC2/ECS + CDN + TLS + deploy scripts | Builds, HTTPS, CDN, serverless compute, scaling, preview deployments, rollbacks | Runtime configuration, cost limits, application reliability |
| Supabase Postgres | PostgreSQL installed on a server or AWS RDS | Provisioning, connections, backups, dashboard, managed upgrades | Schema design, indexes, SQL, migrations, retention |
| Supabase JS | `psycopg`, SQLAlchemy, Django ORM, Node `pg`, Prisma | Typed client and generated data API | Query design, transactions, avoiding N+1 queries |
| Supabase Auth | Django Auth, Passport.js, custom session tables, Auth0 | User creation, tokens, session refresh, magic links, OAuth | Login UX, authorization rules, account deletion, abuse controls |
| Supabase RLS | Authorization checks inside every API query | Database-enforced per-row access | Writing and testing correct policies |
| OpenAI background Response | Celery/BullMQ job submitted to a worker | Durable model execution after the request returns | Run state, webhook handling, validation, retries/reconciliation |https://www.youtube.com/watch?v=Ee6UsflB6SA
| OpenAI webhook | Callback endpoint from any external job provider | Completion notification | Signature verification, idempotency, database transaction |
| Vercel WAF | Nginx rate limits or Redis middleware | Edge blocking and request counting | Choosing fair limits and user quotas |
| Sentry/Vercel Observability | Log aggregation, Prometheus, Grafana, alert manager | Hosted logs, traces, errors, dashboards, alerts | Useful metadata, alert thresholds, incident response |
| GitHub Actions | Jenkins or deployment shell scripts | Hosted CI runners and workflow triggers | Test commands, migration order, release policy |

### The same system, built traditionally

A conventional Python deployment could use:

```text
React/Vite frontend
  → Nginx
  → FastAPI or Django REST API
  → PostgreSQL
  → Celery workers through Redis or RabbitMQ
  → OpenAI API and search provider
  → browser polls the API for run status
  → browser

Docker images
  → GitHub Actions
  → AWS ECS/EC2 or Kubernetes

Logs/metrics
  → ELK + Prometheus + Grafana
```

The selected version is the same shape with fewer services to operate:

```text
Next.js browser UI
  → Next.js Route Handlers on Vercel
  → Supabase Postgres/Auth
  → OpenAI background Response + web search
  → signed webhook back to Vercel
  → browser polls the run Route Handler

GitHub
  → GitHub Actions
  → Vercel + Supabase migrations
```

### Translation guide

- `app/api/runs/route.ts` is conceptually `@app.post("/api/runs")` in FastAPI, a Django REST view, or `router.post("/api/runs")` in Express.
- A Next.js Route Handler runs server-side JavaScript/TypeScript on Node.js. It is not browser code, even though it lives in the same repository.
- Supabase is still PostgreSQL. Standard SQL, indexes, foreign keys, transactions, and migrations still apply.
- Supabase Auth is an authentication service connected to that Postgres project; it does not decide the product's authorization rules for us.
- Vercel is the application host. It does not replace the database or make server code safe automatically.
- A webhook is an ordinary authenticated HTTP request from OpenAI to our backend.
- “Serverless” means the platform starts and scales compute for requests. It does not mean there is no server.
- We can move from Supabase to ordinary Postgres, or from Vercel to a Node container, without changing the core product model.

### What is not abstracted

Managed infrastructure helps us ship faster, but PulseCheck still requires careful engineering of:

- Exact claim extraction and character offsets
- Source quality and temporal reasoning
- Prompt and structured-output schemas
- Minimal, faithful text patches
- Database relationships and migrations
- RLS policies and user-data isolation
- Webhook signatures and idempotency
- Failure recovery and reconciliation
- Rate and cost limits
- Tests, observability, privacy, and deletion

These are the parts that make the product trustworthy. Vercel and Supabase remove infrastructure work; they do not remove application engineering.

### Why this combination

**Next.js + Vercel** is the shortest path from a GitHub repository to a polished full-stack deployment with preview URLs and server-side Route Handlers. Cloudflare is a strong second choice for lower-level edge control, but full-stack Next.js uses an OpenNext adapter; Render is a good choice when a persistent Node service is required. PulseCheck does not need either tradeoff because OpenAI will own the long-running model job. [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Vercel Git deployments](https://vercel.com/docs/git), [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Render Next.js](https://render.com/docs/deploy-nextjs-app)

**Supabase** keeps Postgres, authentication, row-level authorization, and migrations under one provider. Neon + Clerk is excellent when authentication or database scaling needs separate best-of-breed vendors; Firebase is fast for realtime apps but PulseCheck's documents, runs, findings, evidence, and decisions fit a relational model better. [Supabase database](https://supabase.com/docs/guides/database/overview), [Supabase Auth](https://supabase.com/docs/guides/auth), [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations)

**OpenAI background mode + webhooks** makes a run survive a browser disconnect without introducing a queue. The API can run a Response asynchronously, and a signed `response.completed` webhook can finalize the run. If the workflow later becomes many independently retried steps, add Inngest; its value is durable step-level retries, but that is an unnecessary second orchestrator for the first production version. [OpenAI background mode](https://developers.openai.com/api/docs/guides/background), [OpenAI webhooks](https://developers.openai.com/api/docs/guides/webhooks), [Inngest durable execution](https://www.inngest.com/docs/learn/how-functions-are-executed)

### Selected application stack

- **Node.js 24 LTS**, selected in `.nvmrc`/`.node-version` and as `"node": "24.x"` in `package.json#engines` so local development and Vercel use the same supported major
- **pnpm**, pinned in `package.json#packageManager`; commit `pnpm-lock.yaml`
- Latest stable **Next.js App Router, React, and TypeScript** generated by `create-next-app` and then locked in the lockfile
- **Tailwind CSS 4** through its official PostCSS integration, with a small custom OpenAI-inspired design system
- Plain React span rendering; no rich-text framework
- **Zod 4** for environment, API, domain, and AI-response validation
- Latest stable **Vitest + React Testing Library + `user-event`** for unit and component tests
- **Playwright** for end-to-end tests
- **Supabase JS** with generated database types
- **Supabase CLI** as a pinned project dev dependency, invoked through `pnpm supabase`

Do not use Playwright's experimental component-testing package. Use React Testing Library for components and `@playwright/test` only for browser-level journeys. Avoid unit-testing async Server Components; cover them through Playwright. [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing), [Next.js Vitest setup](https://nextjs.org/docs/app/guides/testing/vitest), [Playwright component status](https://playwright.dev/docs/test-components)

Install current stable packages during M1, review their release notes, and commit the exact lockfile. Do not use beta, release-candidate, canary, or `latest` model aliases in production. Configure Dependabot weekly for npm and GitHub Actions; upgrades land in separate green pull requests.

### Selected AI stack

- OpenAI **Responses API**
- **`gpt-5.6-sol`** as the initial `OPENAI_MODEL` value; keep it environment-configurable
- Built-in web search
- Background mode for durable execution
- `store: false` to minimize provider-side retention while still allowing temporary background processing
- Strict Structured Output matching the finding schema
- `include: ["web_search_call.action.sources"]` so returned evidence can be checked against consulted URLs
- Signed completion webhook

GPT‑5.6 Sol is the current flagship recommendation and supports the Responses API, web search, and structured output. Web-search citations shown to users must be clearly visible and clickable. The JavaScript SDK supports Zod-defined structured output. Use a plain-object root schema with every property required and nullable fields for optional values. [GPT‑5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [web-search citations and sources](https://developers.openai.com/api/docs/guides/tools-web-search), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

Background Responses support `store: false`, although OpenAI temporarily stores response data to execute and poll the asynchronous job. Disclose this processing before submission and document the app's own retention separately. [OpenAI background mode](https://developers.openai.com/api/docs/guides/background)

Keep `OPENAI_API_KEY`, `OPENAI_WEBHOOK_SECRET`, and the Supabase secret/service-role key server-only. Only the Supabase URL and publishable key may use the `NEXT_PUBLIC_` prefix.

### Documentation baseline checked July 18, 2026

- Node 24 is LTS; Node 26 is Current and is not the production choice yet. [Node release schedule](https://nodejs.org/en/about/previous-releases)
- The Next.js documentation reported **16.2.10** as current during this audit. Its installer requires at least Node 20.9 and defaults to TypeScript, Tailwind, ESLint, App Router, and Turbopack. M1 must record the versions actually generated and commit the lockfile rather than relying on this prose later. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest)
- Tailwind's current Next.js path uses `@tailwindcss/postcss` and `@import "tailwindcss"`. [Tailwind Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- Zod 4 is stable. [Zod 4](https://zod.dev/packages/zod)
- Use the latest non-prerelease Vitest release compatible with Node 24 and lock it. The release page, rather than a stale migration page or model memory, is the version source of truth. [Vitest releases](https://main.vitest.dev/releases)
- Supabase schema changes are SQL migrations committed under `supabase/migrations/`, validated with local reset and database tests. Install the CLI as a pinned project dependency and invoke it through pnpm. [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations), [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview)

## 9. Production architecture

### Request lifecycle

```text
Browser
  → POST /api/runs
  → Route Handler verifies the Supabase bearer token
  → atomic Postgres function enforces quota and creates document + analysis_run
  → Vercel starts an OpenAI Response with background=true
  → response ID is saved; browser polls GET /api/runs/:id
  → OpenAI sends response.completed to /api/webhooks/openai
  → raw webhook body is verified with the official SDK
  → response is retrieved, Zod-validated, citations cross-checked, and spans resolved
  → one Postgres RPC transaction saves findings/sources and completes the run
  → the next browser poll receives the result
  → article renders findings and edits
```

Poll every 2 seconds while the page is visible, back off after 30 seconds, stop at a terminal state, and resume after refresh. If a webhook is delayed or missed, `GET /api/runs/:id` reconciles stale non-terminal runs against the Responses API before replying. A small scheduled reconciliation endpoint is optional hardening in M4, not an M1 dependency.

### Database

Use hosted Supabase Postgres from day one.

| Table | Purpose |
|---|---|
| `documents` | User, original text, title, creation date |
| `analysis_runs` | Document, status, as-of date, model, OpenAI response ID, error, timestamps |
| `findings` | Derived UTF-16 offsets, exact source text/anchors, claim type, verdict, nullable forecast status, confidence, explanation, replacement |
| `sources` | Finding, URL, title, publisher, and publication date |
| `edit_decisions` | Accepted/rejected/restored decisions |
| `webhook_events` | Unique event IDs for idempotent webhook processing |

Store original text immutably. Updated text is derived from accepted edit decisions so the original can always be recovered.

Supabase JS does not provide a client-side multi-table transaction builder. Put completion logic in one Postgres function, revoke its execution from `anon` and `authenticated`, grant it only to the server role, and call it with `supabase.rpc(...)`. Do the same for the atomic quota-check-plus-run-creation operation. Review any `SECURITY DEFINER` function carefully and set a safe `search_path`. [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc), [securing database functions](https://supabase.com/docs/guides/api/securing-your-api)

### Authentication and authorization

- Create a Supabase anonymous user in the browser on first visit so judges see no login wall.
- Offer optional email access by converting the current anonymous user with `updateUser({ email })`, email verification, and then passwordless email sign-in for later sessions. Enable Supabase manual identity linking, and do not silently create a second user or orphan the first user's documents.
- Attach every document to `auth.uid()`.
- Enable Row Level Security on every exposed table.
- Users can access only their own documents, runs, findings, sources, and decisions.
- The browser sends its access token to Route Handlers in the `Authorization` header.
- User-facing routes verify that token with `getClaims()` or `getUser()` and use a user-scoped Supabase client so RLS remains active.
- Use a separate secret/service-role client only for the signed OpenAI webhook, reconciliation, and other explicitly administrative operations. Never reuse it for user-facing reads.

Supabase anonymous users have unique IDs, use the `authenticated` Postgres role, and can use the same RLS protections as permanent users. Converting one to a permanent email identity requires manual linking plus `updateUser`; signing into an already-existing account is a separate conflict flow. Enable CAPTCHA/Turnstile before the public launch and distinguish anonymous accounts through the JWT claim where needed. [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [verified JWT claims](https://supabase.com/docs/reference/javascript/auth-getclaims)

### Run status delivery

Use ordinary authenticated HTTP polling in v1. A 2-second interval for a single active run is easy to test, survives refreshes, and avoids private Realtime channel policies, reconnection code, and a second delivery path. Add Realtime only after production measurements show polling is a problem.

### API routes

| Route | Purpose |
|---|---|
| `POST /api/runs` | Validate input, create records, start background Response |
| `GET /api/runs/:id` | Read status/results and reconcile stale runs |
| `POST /api/webhooks/openai` | Verify signature and persist completed results |
| `PATCH /api/findings/:id/decision` | Accept, reject, or restore an edit |
| `DELETE /api/documents/:id` | Permanently delete a user's document and related data |

### Security and cost controls

- Vercel WAF rate limit on `POST /api/runs` by IP as a coarse abuse barrier.
- Atomic per-user daily run and character quotas enforced inside the run-creation Postgres function.
- V1 limit: 20,000 input characters and at most 25 researched claims per run; return a clear validation error before calling OpenAI.
- Verify webhook signatures using the raw request body.
- Make webhook processing idempotent using the OpenAI event ID.
- Never log article bodies, source excerpts, API keys, or authentication tokens.
- Provide user-visible deletion and a documented retention policy.
- Validate all AI output with Zod before database writes.
- Treat prompt text and web content as untrusted; reject instructions embedded in the article or sources.
- Accept only `https:` evidence URLs found in OpenAI's returned citation/source metadata; external links use `rel="noopener noreferrer"`.
- A high-confidence correction must have at least one supporting citation. An unsupported, unresolved, or opinion finding cannot contain a replacement.
- Render pasted article text only as React text nodes; never use `dangerouslySetInnerHTML` for articles, model output, explanations, or source titles.
- Explain that deletion removes PulseCheck's stored copy; provider-side temporary processing follows the documented OpenAI API behavior.

Vercel WAF rate limiting is available on all plans, but plan limits and usage pricing still apply. It complements rather than replaces the database quota. [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)

### Environments and delivery

- **Local:** Next.js plus local Supabase CLI stack and committed seed data.
- **Preview:** All Vercel preview deployments connect to one non-production Supabase project. Do not require Vercel Custom Environments.
- **Production:** `main` on Vercel connected to a separate production Supabase project.
- Commit every database change under `supabase/migrations/`.
- GitHub Actions uses Node 24 and `pnpm install --frozen-lockfile`, then runs formatting, linting, type checking, unit/component tests, fixture tests, database tests when present, Playwright smoke tests, and a production build.
- Validate migrations locally with `pnpm supabase db reset --local`; preview remote changes with `pnpm supabase db push --dry-run --linked` before applying them. Always state `--local` or `--linked` explicitly for destructive or deployment-oriented database commands.
- Make application/database changes backward compatible: add/expand first, deploy code second, and remove/contract only in a later migration. This avoids racing Vercel's automatic deployment.
- Keep runtime secrets in Vercel sensitive environment variables. If GitHub Actions deploys migrations, store only the required deployment credentials in protected GitHub environment secrets—never in source or ordinary variables.
- Pin third-party GitHub Actions to full commit SHAs and let Dependabot update both npm and Actions references.

Supabase recommends local migration files and explicit reset/dry-run/push workflows. Vercel provides Local, Preview, and Production without requiring a paid custom staging environment. [Supabase local workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [Vercel environments](https://vercel.com/docs/deployments/environments), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)

### Observability

- Vercel Observability for deployments, function timing, external calls, and runtime logs.
- Sentry in M4 for frontend/server exceptions and release-linked alerts; it is not an M1 blocker.
- Log structured metadata only: `run_id`, `response_id`, status, duration, model, token/tool usage, and error code.
- Alert on webhook failures, stuck runs, elevated error rates, and unexpected OpenAI spend.
- Redact request bodies and authentication headers before either provider receives an event.

Vercel provides runtime logs, tracing, and external API visibility without separate infrastructure. [Vercel Observability](https://vercel.com/docs/observability)

### Deployment

- GitHub is the source of truth.
- Vercel automatically creates a preview for each pull request.
- `main` deploys the production application.
- Supabase hosts Postgres and Auth.
- No Docker, queue cluster, Kubernetes, or manually managed server is required.

Do not use GitHub Pages: it is static hosting and cannot securely run PulseCheck's API or webhook routes. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

### Repository shape

```text
app/
  api/runs/route.ts
  api/runs/[id]/route.ts
  api/webhooks/openai/route.ts
  api/findings/[id]/decision/route.ts
  api/documents/[id]/route.ts
  layout.tsx
  page.tsx
components/
  article-editor.tsx
  evidence-panel.tsx
  finding-dot.tsx
  product-shell.tsx
lib/
  contracts/
    api.ts
    finding.ts
    run.ts
  domain/
    resolve-spans.ts
    derive-updated-text.ts
  analysis/
    fixture-provider.ts
    openai-provider.ts
    prompt.ts
  server/
    auth.ts
    config.ts
    repositories.ts
  supabase/
    browser.ts
    user-server.ts
    admin-server.ts
    database.types.ts
supabase/
  config.toml
  migrations/
  tests/
  seed.sql
fixtures/
  demo-article.txt
  demo-expected.json
tests/
  unit/
  component/
  contract/
  integration/
  e2e/
.github/workflows/ci.yml
.github/dependabot.yml
.env.example
.nvmrc
pnpm-lock.yaml
```

Keep tests organized by behavior rather than mirroring every source file. Small unit tests may be colocated when that makes ownership clearer. Never import `lib/server` or service SDKs from `components` or `lib/domain`.

## 10. Two-developer delivery roadmap

### Before M1 starts: 15-minute preflight

This is the only setup gate before coding. Do not block M1 on live Supabase or OpenAI credentials because its default path uses fakes.

- Confirm the Git repository root and default branch, protect `main`, require the CI check, and enable pull-request previews in Vercel.
- Install Node 24 LTS and enable Corepack/pnpm. M1 selects Node `24.x`, pins the exact pnpm version, and commits the generated lockfile; developers do not rely on globally drifting package versions.
- Confirm both developers can run GitHub, Vercel, and the repository locally. A Docker-compatible runtime and the Supabase CLI are required before M2, not M1.
- Create one non-production Supabase project before M2 and a separate production project before M4. Never point previews at production data.
- Confirm the OpenAI project can call the configured model with Responses, web search, background mode, and webhooks before M3's merge gate. Keep `OPENAI_MODEL` configurable so account availability can be handled without a code change.
- Decide the public-launch daily run quota, anonymous-data retention period, and maximum OpenAI spend before M4. The code already fixes the per-run limits at 20,000 characters and 25 researched claims.
- Put placeholders—not real secrets—in `.env.example`. M1 must run and test successfully with `DATA_BACKEND=fake` and `ANALYSIS_PROVIDER=fixture` and no provider keys.

**Preflight outcome:** once the repository, Node/pnpm, and fake local path are available, start M1. Provider accounts and production policy decisions have later ticket deadlines and should not slow down the skeleton.

### The operating model

Mahmoud first creates the entire compile-safe skeleton in **M1**. Every planned module exists, has an owner-tagged comment such as `TODO(F2)`, and is connected through typed interfaces. The application runs with fixture-backed fakes, so Fadi never has to wait for Supabase or OpenAI.

Do not put incomplete business logic into the skeleton. A skeleton module should contain its public types, function signatures, explanatory ticket comments, and either a safe fake implementation or an explicit `501 Not Implemented` server response. `main` must always stay green and deployable.

After M1 merges:

- Mahmoud owns infrastructure and server adapters.
- Fadi owns the product UI, span engine, and fact-checking behavior.
- Mahmoud writes shared contract tests and production safety tests.
- Fadi writes the unit, component, and evaluation tests for his implementations.
- Both developers must approve changes to shared contracts.

### Ownership boundaries

| Mahmoud primarily owns | Fadi primarily owns | Shared; both review |
|---|---|---|
| `app/api/`, `lib/server/`, `lib/supabase/`, `supabase/`, `.github/`, environment configuration | `components/`, `app/page.tsx`, `lib/domain/`, `lib/analysis/`, UI tests and eval fixtures | `lib/contracts/`, fixture semantics, API payloads, verdict definitions |

Domain code must not import Supabase, Vercel, OpenAI SDK objects, or Next.js. Adapters translate managed-service data into the shared domain contracts.

### Ticket-comment convention

M1 adds a ticket comment at each unfinished seam:

```ts
// TODO(F2): Validate and apply non-overlapping finding spans.
// Acceptance: preserve every untouched character and pass tests/span-utils.test.ts.
export function applyFindingDecisions(/* typed arguments */) {
  return fakeApplyFindingDecisions(/* fixture-backed arguments */);
}
```

Use one useful comment per responsibility, not a TODO on every line. When a ticket is completed, its TODO comments must be removed in that ticket's pull request. Check this with `rg 'TODO\(F2\)'` or the corresponding ticket ID during review; do not build a custom ticket-state system into CI.

### M1 — Mahmoud: complete skeleton, contracts, fakes, and CI

**Start gate:** This is the first ticket. No other implementation ticket starts until M1 is merged.

**Create and configure:**

- Select Node `24.x` and pin pnpm, scaffold the latest stable Next.js App Router with TypeScript, Tailwind, and ESLint, then add Prettier, Vitest, React Testing Library, `user-event`, and Playwright.
- Create every directory in the repository shape from Section 9, plus validated server/client environment configuration and a README with exact setup commands.
- Add typed Zod contracts for `Document`, `AnalysisRun`, `Finding`, `Source`, `EditDecision`, `queued|in_progress|completed|failed` run status, claim type, verdict, nullable forecast status, confidence, and every API request/response.
- Keep two explicit layers: `AnalysisOutputSchema` for untrusted model output and `FindingSchema` for the validated server/domain record. The model schema excludes `checkedAt` and derived offsets; the server schema adds them only after validation and deterministic span resolution.
- Design `AnalysisOutputSchema` as one root object with all fields required and nullable optionals. Enable TypeScript strict mode, avoid `any`, and derive types from the schemas rather than maintaining duplicate handwritten shapes.
- Add service interfaces: `RunClient`, `DocumentRepository`, `RunRepository`, and `AnalysisProvider`.
- Add `FakeRunClient`, in-memory repositories, and `FixtureAnalysisProvider` using the nine-finding demo fixture.
- Add `DATA_BACKEND=fake|supabase` and `ANALYSIS_PROVIDER=fixture|openai` configuration. Defaults are fake/fixture locally.
- Create all future route, component, domain, analysis, Supabase, and test files with `TODO(M2)` through `TODO(F5)` comments.
- Render one ugly but functional vertical slice: load the fixture, submit it, receive a fake completed run, and print the JSON findings. F1 will replace this UI.

**Tests Mahmoud writes:**

- Contract parsing and cross-field invariant tests for valid and invalid payloads.
- Fixture validation: unique IDs and every `sourceText` exists in the article.
- A shared adapter contract suite that can run against both fake and future real adapters.
- One Playwright smoke test proving the fixture can travel through the fake vertical slice.
- CI uses Node 24 and a frozen pnpm lockfile, then runs format check, `eslint .`, type-check, unit/component tests, fixture tests, a Chromium Playwright smoke test, and production build. Pin third-party Actions to commit SHAs.

**Merge gate:** CI is green, the Vercel preview loads, Fadi can clone the repository and run it from the README, both developers approve the contracts, and every unimplemented seam has exactly one owner-ticket comment.

**Unlocks:** M2, F1, and F2.

### F1 — Fadi: product shell and article input

**Start gate:** M1 is merged. Branch from the latest `main`.

**Implement:**

- Replace the temporary page with the minimal OpenAI-style shell and working PulseCheck tab.
- Build the paste area, character count, prepared-example loader, Run button, and reset action.
- Implement empty, ready, checking, completed, and error states against `FakeRunClient` only.
- Keep all backend details behind `RunClient`; UI code must not import Supabase or call OpenAI.
- Make the layout usable on laptop and mobile widths, with keyboard navigation and visible focus states.
- Remove all `TODO(F1)` comments.

**Tests Fadi writes:**

- Vitest + React Testing Library tests for all five UI states, using `user-event` for interaction.
- Input validation tests for empty and oversized articles.
- A Playwright flow that loads the example, clicks Run, and reaches the fake completed state.

**Merge gate:** F1 tests and the entire M1 suite pass, the Vercel preview matches the intended visual direction, and Mahmoud approves that the UI uses only the shared client contract.

**Unlocks:** F3 after F2 also merges. F1 does not wait for M2.

### M2 — Mahmoud: Supabase, anonymous auth, and row isolation

**Start gate:** M1 is merged. This runs in parallel with F1 and then F2.

**Implement:**

- Add the current stable Supabase CLI as an exact dev dependency and run all local/remote CLI operations through `pnpm supabase`.
- Create migrations for `documents`, `analysis_runs`, `findings`, `sources`, `edit_decisions`, and `webhook_events`.
- Add indexes, foreign keys, cascade behavior, timestamps, run-status constraints, and immutable original text.
- Implement a browser Supabase client, a user-scoped server client, and a separate admin server client; generate TypeScript database types.
- Create an anonymous Supabase user on first visit, send its bearer token through `RunClient`, verify it server-side, and attach records to `auth.uid()`.
- Enable manual identity linking, convert the anonymous user with `updateUser({ email })` plus email verification, configure passwordless-email redirect URLs for later sign-ins, and handle an already-registered email as an explicit conflict rather than creating a disconnected account.
- Enable RLS on every exposed table, add least-privilege grants, index ownership columns, and write operation-specific ownership policies. Do not grant blanket CRUD: users need owner-scoped reads and only the narrowly required write/RPC paths.
- Add Postgres functions for atomic quota/run creation and transactional run completion; restrict execution to the appropriate roles.
- Create local seed data and document local, preview/non-production, and production setup.
- Implement the Supabase repository adapters without changing shared contracts.
- Remove all `TODO(M2)` comments.

**Tests Mahmoud writes:**

- Migration-up test from an empty local database using `pnpm supabase db reset --local`.
- Repository contract suite against Supabase.
- pgTAP/RLS tests proving User A cannot read or mutate User B's records and anonymous users cannot exceed granted operations.
- Atomic quota, transactional completion/rollback, cascade deletion, and immutable-original-text tests.

**Merge gate:** Migrations recreate the database from zero, generated types are committed, repository contract and RLS tests pass, and the preview can create an anonymous session. It does not need a real OpenAI run yet.

**Unlocks:** M3.

### F2 — Fadi: exact-span edit engine

**Start gate:** M1 is merged. Fadi should start this after merging F1 to avoid carrying two personal branches.

**Implement:**

- Resolve `sourceText` plus prefix/suffix anchors into JavaScript UTF-16 offsets; the model never supplies authoritative offsets.
- Require one unique match, sort spans deterministically, and reject ambiguity, overlaps, invalid offsets, and duplicate finding IDs.
- Convert original text plus findings into immutable render segments.
- Support strikethrough deletion, green replacement, accept, reject, restore, and “show original.”
- Derive updated text from original text and decisions; never overwrite the stored original.
- Preserve every untouched character exactly, including whitespace, punctuation, Unicode, and repeated phrases.
- Remove all `TODO(F2)` comments.

**Tests Fadi writes:**

- Table-driven tests for all nine demo findings.
- Cases for surrogate pairs/emoji, combining characters, repeated phrases, anchor disambiguation, adjacent edits, nested/overlapping spans, zero-length spans, bad quotes, and findings returned out of order.
- Round-trip test proving reject/restore recreates the exact original article.

**Merge gate:** Pure domain tests pass with no browser, database, or network dependency; the fixture renders deterministically; Mahmoud approves the offset invariants.

**Unlocks:** F3 and F4.

### M3 — Mahmoud: run API and durable OpenAI lifecycle

**Start gate:** M2 is merged. Shared contracts from M1 remain unchanged unless both developers approve a revision.

**Implement:**

- Implement `POST /api/runs`: verify the bearer token, validate the 20,000-character limit, atomically enforce quota/create the run, submit the background Response with `store: false`, and mark the run failed if submission fails.
- Implement `GET /api/runs/:id` with user-scoped RLS, ownership checks, polling-friendly `Cache-Control: private, no-store`, and stale-run reconciliation.
- Implement the Node-runtime OpenAI webhook by reading `request.text()`, calling the official SDK's `webhooks.unwrap(...)`, and recording unique event IDs.
- Retrieve the completed Response, parse strict structured output, cross-check evidence URLs against citation/source metadata, resolve spans, and call the transactional completion RPC.
- Define allowed status transitions: `queued → in_progress → completed|failed`; map every non-success OpenAI terminal status to `failed` with a safe error code.
- Make duplicate webhooks and repeated GET reconciliation safe.
- Keep the `FixtureAnalysisProvider` available so normal CI does not spend money or need network access.
- Remove all `TODO(M3)` comments.

**Tests Mahmoud writes:**

- API contract tests for validation, authorization, and status codes.
- State-machine tests for success, submission failure, model failure, invalid structured output, uncited sources, ambiguous spans, duplicate webhooks, and missed-webhook reconciliation.
- Transaction rollback test proving partial findings are never displayed.

**Merge gate:** Routes pass against fake OpenAI in CI, one opt-in Preview run succeeds with real OpenAI, webhook signatures and idempotency are verified, and Fadi can retrieve the result using only `RunClient`.

**Unlocks:** M4 and the backend half of F5.

### F3 — Fadi: inline findings and evidence experience

**Start gate:** F1 and F2 are both merged. M3 is not required; continue using fake data.

**Implement:**

- Render exact text segments with quiet margin dots and verdict-specific styling.
- Show any source text selected for an evidence-backed replacement as strikethrough and its proposed replacement in green; do not imply that every outdated or qualified phrase was originally a lie.
- Build the side evidence panel with verdict, confidence, explanation, checked date, and clickable sources.
- Add accept, reject, restore, show-original, next-finding, and previous-finding interactions.
- Keep unsupported, opinion, and low-confidence findings visually distinct from proven corrections.
- Preserve selection, scroll position, keyboard access, and a calm article-first layout.
- Remove all `TODO(F3)` comments.

**Tests Fadi writes:**

- React Testing Library tests for every verdict, forecast status, and confidence combination.
- `user-event` interaction tests for dot selection, panel navigation, accept/reject/restore, and show-original.
- Accessibility checks for focus order, labels, contrast, and keyboard use.
- Playwright demo using all nine fixture findings.

**Merge gate:** The entire demo is usable with fakes, editing never changes unselected text, sources are clickable, and the other developer can complete the journey without instructions.

**Unlocks:** The UI half of F5.

### F4 — Fadi: fact-checking business logic and evaluations

**Start gate:** F2 is merged. M3 is not required because this implements the existing `AnalysisProvider` interface.

**Implement:**

- Build prompts that extract checkable claims and return exact quotes with prefix/suffix anchors, not trusted numeric offsets.
- Prioritize time-sensitive roles, numbers, dates, rankings, forecasts, and scope words such as “all,” “always,” “best,” “currently,” and “latest.”
- Define source-quality and recency guidance, including how conflicting sources are handled.
- Map evidence only to the normalized verdict enum; put `revised` and `pending` in `forecastStatus`, and use `needs_context` rather than a duplicate `misleading` verdict.
- Generate the smallest defensible replacement. Low-confidence findings may be flagged but cannot receive an authoritative automatic correction.
- Parse through the shared Zod schema, require cited evidence for corrections, and let the deterministic resolver derive offsets.
- Cross-check every claimed evidence URL against `web_search_call.action.sources` or URL citation annotations; consulted URLs are not automatically proof, so the explanation must state what each selected citation supports.
- Use recorded fixtures in CI and keep live-model evaluations opt-in.
- Remove all `TODO(F4)` comments.

**Tests Fadi writes:**

- At least one evaluation case for every verdict.
- Cases for current officeholders, changed statistics, revised forecasts, absolute language, unsupported precision, opinion, and internal contradiction.
- Assertions for source/citation presence, uniquely resolvable quotes, minimal replacement, confidence policy, forecast-state separation, and no-change behavior for verified claims.

**Merge gate:** The prepared fixture passes its required invariants, malformed or uncited output is rejected safely, live evaluation results are reviewed by both developers, and the provider still satisfies M1's contract suite.

**Unlocks:** The analysis half of F5.

### M4 — Mahmoud: production delivery, security, and observability

**Start gate:** M3 is merged. This keeps Mahmoud to one personal implementation branch and lets hardening observe the real run lifecycle.

**Implement:**

- Connect Vercel Preview and Production to separate non-production and production Supabase projects; do not add a paid custom staging environment.
- Configure server-only secrets, migration delivery, Vercel WAF limits, and database-backed per-user quotas.
- Add Sentry plus structured logs containing IDs, status, duration, token/tool usage, and error codes—but never article text or secrets.
- Implement document deletion and retention behavior.
- Add security headers, safe external-link behavior, and alerts for failed webhooks, stuck runs, error-rate spikes, and spend anomalies.
- Document deploy, rollback, secret rotation, and database recovery steps.
- Remove all `TODO(M4)` comments.

**Tests Mahmoud writes:**

- Secret/client-bundle inspection, quota tests, deletion test, and log-redaction tests.
- Preview smoke test after migrations and deploy.
- Alert test or documented alert simulation for a stuck run.

**Merge gate:** A preview deployment passes smoke tests, secrets remain server-only, logs are clean, quotas and deletion work, and rollback instructions have been dry-run where safe.

**Unlocks:** M5 after F5 is also merged. It does not block F5's Preview integration work.

### F5 — Fadi: real integration and complete judge journey

**Start gate:** M3, F3, and F4 are merged. M4 may continue in parallel because F5 needs the real Preview API, not completed production hardening.

**Implement:**

- Switch the UI from `FakeRunClient` to the real HTTP client without changing components or domain logic.
- Submit a run and poll its authenticated status endpoint with visibility-aware backoff; do not add Realtime in v1.
- Restore an in-progress or completed run after refresh.
- Handle quota, validation, research failure, timeout, and retry states in plain language.
- Verify every source opens and every accepted edit produces the expected updated article.
- Keep fake mode available for deterministic demos and local development.
- Remove all `TODO(F5)` comments.

**Tests Fadi writes:**

- Playwright happy path against Preview: anonymous visit → paste → run → refresh → inspect evidence → accept/reject → compare original.
- Playwright recovery cases for polling fallback and terminal error display.
- Preview demo checklist using the prepared article; repeat it against Production during M5.

**Merge gate:** The Preview judge journey passes twice from a clean browser, refresh does not lose the run, fake-mode tests remain deterministic, and both developers approve the integration preview.

**Unlocks:** M5 after M4 is also merged.

### M5 — Mahmoud: reliability gate and release

**Start gate:** F5 and every previous ticket are merged.

**Implement and verify:**

- Run the full unit, integration, RLS, contract, evaluation, and Playwright suites.
- Exercise invalid AI output, uncited/unsafe URLs, ambiguous spans, duplicate and missing webhooks, unauthorized access, quotas, deletion, timeout, and provider failure.
- Confirm monitoring, alerts, rate limits, cost caps, and rollback procedures.
- Inspect the evidence for every prepared-demo finding; do not rely only on the model's score.
- Remove or resolve every remaining `TODO(M1)` through `TODO(F5)` marker.
- Freeze the demo fixture, tag the release, and record the known limitations.

**Merge/release gate:** CI and production smoke tests pass, no release-blocking TODO remains, the demo has a fallback fixture mode, and both developers sign off on the exact pitch flow.

### Exact start and merge order

This is the recommended human work sequence. It keeps one active implementation branch per developer and makes every dependency explicit.

1. **Mahmoud works on M1 alone.** Fadi reviews the proposed contracts, sets up the tools locally, and asks questions, but does not begin an implementation branch.
2. **Merge M1 into `main`.** Do not start M2, F1, or F2 before this merge.
3. **Create two branches from the new `main`: Mahmoud starts M2; Fadi starts F1.** These touch separate file areas.
4. **Merge F1 as soon as its preview and tests pass.** F1 does not wait for M2.
5. **Fadi starts F2 from the latest `main`.** Mahmoud continues M2.
6. **Merge M2 when migrations, repositories, anonymous auth, and RLS tests pass.** M2 does not wait for F2.
7. **Mahmoud starts M3 from the latest `main`.** M3 may start only after M2 merges.
8. **Merge F2 when all pure span tests pass. Fadi then starts F3.** F3 may start only after both F1 and F2 are merged.
9. **Merge M3 when fake CI and the opt-in Preview OpenAI run pass. Mahmoud then starts M4.**
10. **Merge F3 when the complete fixture experience works with fakes. Fadi then starts F4.** F4 technically needs only F2, but this order avoids two Fadi branches and reduces context switching.
11. **Merge F4 when its evaluations pass; Fadi then starts F5 once M3 and F3 are also on `main`.** F5 does not wait for M4. Mahmoud continues M4, and neither developer edits the other's ownership area without coordinating.
12. **Merge F5 after the Preview judge journey passes twice. Merge M4 independently when its production gate passes.** Either may land first.
13. **Start M5 only after both F5 and M4 are on `main`.** This is the point where the integrated product and production hardening meet.
14. **Mahmoud completes the M5 release gate and tags the production release.** No new feature work enters during M5.

The hard dependency graph is:

```text
M1 ──┬── M2 ── M3 ──────┬── F5 ──┬── M5
     │        └── M4 ────┼────────┘
     ├── F1 ──┐          │
     └── F2 ──┴── F3 ────┤
              └── F4 ────┘
```

### Pull-request rules

- One ticket per pull request and one active implementation branch per developer.
- Update the branch from `main` before final review.
- Never merge failing or skipped required tests.
- The ticket owner writes implementation tests; Mahmoud owns only shared-contract and production-safety suites.
- The other developer manually checks the preview deployment.
- Contract changes need both approvals and must update fakes before adapters.
- Completing a ticket removes all of that ticket's TODO comments.
- Feature flags and fakes keep unfinished production integrations off the default user path.
- No secrets or article bodies may appear in logs, test snapshots, or client bundles.

## 11. Done

A judge can open the production URL without creating an account, load the fixture, run PulseCheck, leave or refresh the page without losing the run, inspect sources, accept or reject edits, and compare the original and updated article. The same deployment has persistent storage, RLS-protected user data, signed webhooks, rate limits, migrations, CI, logs, and error reporting.
