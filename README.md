# PulseCheck

PulseCheck fact-checks an article without turning it into a report. It marks claims in the original text, shows the evidence, and lets the reader apply or reject precise corrections in place.

**Live demo:** [pulsecheck-omega.vercel.app](https://pulsecheck-omega.vercel.app)

> Hackathon concept. Not an official OpenAI product.

## Why it matters

Articles age. Job titles change, forecasts get revised, and confident claims lose their support. PulseCheck makes those changes visible while preserving the author's wording and the reader's focus.

Each finding includes:

- a verdict and confidence level;
- a short explanation;
- the date it was checked;
- clickable evidence;
- a correction only when the evidence supports one.

The app distinguishes facts, forecasts, and opinions. It can verify, update, contradict, qualify, or abstain. It does not assign a made-up truth score to an entire article.

## Try the demo

1. Open the [live app](https://pulsecheck-omega.vercel.app).
2. Select **Use demo**.
3. Start the check.
4. Select a marker in the article to inspect its evidence.
5. Accept a correction to apply it in place. Reject it to restore the original wording.

The prepared article uses a deterministic nine-finding fixture, so the core demo is fast and repeatable. Any other pasted text uses OpenAI web research in the deployed app. Completed checks appear in the shared **Recents** list.

## Run locally

You need Node.js 24 and pnpm 11.15.0.

```bash
git clone https://github.com/MahmoudSalah02/fact-check-article.git
cd fact-check-article
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>. The default fixture mode needs no account, database, or API key.

## Run with Supabase and OpenAI

Copy `.env.example` to `.env.local` and provide:

```dotenv
DATA_BACKEND=supabase
ANALYSIS_PROVIDER=openai
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

`OPENAI_WEBHOOK_SECRET` is optional. Without it, the app completes background runs while the browser polls. Keep `.env.local` out of Git. Only the Supabase URL and publishable key belong in the browser bundle.

Anonymous Supabase sessions are created automatically. Completed articles and findings are public in the hackathon gallery. Accept and reject decisions remain private to each anonymous session. Do not submit sensitive text.

## Tests

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:fixture
pnpm test:e2e
pnpm build
```

The live OpenAI evaluation is opt-in because it spends API credit:

```bash
pnpm test:live
```

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- OpenAI Responses API with web search and structured output
- Supabase Postgres, anonymous Auth, SQL migrations, and row-level security
- Vercel
- Vitest, React Testing Library, Playwright, and pgTAP

The immutable source article, typed findings, evidence, run state, and edit decisions are persisted separately. Model-provided character offsets are never trusted; the server resolves quoted text against the original article before an edit can render.
