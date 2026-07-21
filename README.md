# PulseCheck

PulseCheck is an evidence-backed fact proofreader. It preserves an article's original wording, identifies claims that no longer hold up, and proposes the smallest supported corrections with clickable sources.

> Concept prototype for a hackathon; not an official OpenAI product.

## Current status

M1–M3 and F1–F4 are complete. The app runs in two modes:

- **Fixture mode (default, zero config):** the prepared demo article returns nine deterministic, schema-validated findings with no network, database, or provider account.
- **Live mode (`.env.local`):** any pasted article is stored in Supabase under an invisible anonymous session and analyzed by a real OpenAI background response with web search; findings are evidence-checked, span-resolved, and persisted. Completed checks appear in a shared hackathon gallery, while each browser keeps its own accept/reject decisions. The prepared demo article stays free (fixture) even in live mode.

See [PRD.md](PRD.md) for the product, architecture, and delivery roadmap (one FINAL wrap-up ticket remains).

## Local setup

Prerequisites:

- Node.js 24.x (the project includes `.nvmrc` and `.node-version`)
- Corepack or pnpm 11.15.0

On macOS with Homebrew:

```bash
brew install node@24
brew link --overwrite node@24
corepack enable
corepack prepare pnpm@11.15.0 --activate
```

Clone and run:

```bash
git clone https://github.com/MahmoudSalah02/fact-check-article.git
cd fact-check-article
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>, choose **Load demo article**, then choose **Check article**. No `.env.local` is needed for fixture mode.

## Running live analysis (Supabase + OpenAI)

Live mode needs a `.env.local` in the repository root. **Never commit it** — it is gitignored, and every value in it is a secret. Mahmoud shares the current file through a secure channel (password manager or encrypted message; never chat, email, or git). The variables it contains are listed in [.env.example](.env.example): hosted dev Supabase URL/keys, `DATA_BACKEND=supabase`, `ANALYSIS_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.

With the file in place:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

- **Demo article** → completes instantly and free (fixture short-circuit).
- **Any other article** → creates a durable run, submits a background OpenAI response with web search, and the page polls until findings render (typically 20–90 seconds). The OpenAI key is prepaid — each real run costs real money, so don't loop them casually.
- Local Supabase/Docker is **not** required in this mode; the env points at the hosted dev project.

To verify the whole pipeline end to end (5 real articles through the exact app code, ~$0.50 per round):

```bash
pnpm test:live
```

It is skipped automatically in CI and in plain `pnpm test`.

## Quality gate

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:fixture
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

GitHub Actions runs the same checks on pull requests and `main`. Dependencies and third-party Actions are pinned through the committed lockfile and immutable Action SHAs.

### Build bundler

`pnpm dev` uses Turbopack for fast local iteration, but `pnpm build` runs `next build --webpack`. Turbopack's production build currently mis-orders Zod v4's ISO schema modules and crashes with `Cannot access 'af' before initialization` while collecting API-route page data (already on the latest stable Zod, 4.4.3). The webpack build is unaffected and fully supported. `pnpm build:turbopack` is kept so we can re-test Turbopack after a future Next.js or Zod fix and flip `build` back.

Vercel Previews use standard deployment protection. Automated Preview tests may provide `VERCEL_AUTOMATION_BYPASS_SECRET` through secure environment storage; Playwright sends it only as the documented Vercel bypass header.

## M1 boundaries

- `lib/contracts/` owns provider-neutral Zod schemas and inferred TypeScript types.
- `lib/analysis/` owns the provider interface and deterministic fixture provider.
- `lib/server/` owns repositories, adapters, configuration, and future server integrations.
- `lib/domain/` remains free of Next.js, Supabase, Vercel, and OpenAI SDK imports.
- `components/` contains the F1 product shell and article input, plus ticket-owned future UI seams.
- `app/api/` compiles but deliberately returns HTTP `501` until its owning ticket.

Search `TODO(M2)` through `TODO(F5)` to find each explicitly owned implementation seam. Do not implement across another developer's boundary without agreeing on the shared contract first.

## Demo fixture

- Input: [fixtures/demo-article.txt](fixtures/demo-article.txt)
- Expected findings: [fixtures/demo-expected.json](fixtures/demo-expected.json)

## Security

Never commit secrets or paste provider credentials into issues, pull requests, logs, or chat. Local credentials belong in ignored environment files or the provider's secure credential store.
