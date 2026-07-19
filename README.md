# PulseCheck

PulseCheck is an evidence-backed fact proofreader. It preserves an article's original wording, identifies claims that no longer hold up, and proposes the smallest supported corrections with clickable sources.

> Concept prototype for a hackathon; not an official OpenAI product.

## Current status

M1's deterministic fixture-backed vertical slice is complete. F1 adds the calm, article-first PulseCheck shell and input states on top of that same fake `RunClient` boundary: a user can load the prepared article, run the fixture-backed analysis, and receive nine schema-validated findings without a network request, database, provider account, or paid model.

See [PRD.md](PRD.md) for the product, architecture, and two-developer delivery roadmap.

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

Open <http://localhost:3000>, choose **Load demo article**, then choose **Check article**. No `.env.local` is needed for M1. If you create one for future work, start from `.env.example` and never commit it.

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
