# PulseCheck

PulseCheck is an evidence-backed fact proofreader. It preserves an article's original wording, identifies claims that no longer hold up, and proposes the smallest supported corrections with clickable sources.

> Concept prototype for a hackathon; not an official OpenAI product.

## Current status

The product requirements and deterministic demo fixture are complete. M1 will add the Next.js application skeleton, typed contracts, fixture-backed fakes, automated tests, and CI without requiring Supabase or OpenAI credentials.

See [PRD.md](PRD.md) for the product, architecture, and two-developer delivery roadmap.

## Demo fixture

- Input: [fixtures/demo-article.txt](fixtures/demo-article.txt)
- Expected findings: [fixtures/demo-expected.json](fixtures/demo-expected.json)

## Security

Never commit secrets or paste provider credentials into issues, pull requests, logs, or chat. Local credentials belong in ignored environment files or the provider's secure credential store.
