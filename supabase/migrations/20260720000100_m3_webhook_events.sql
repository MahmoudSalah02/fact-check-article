-- M3: idempotency ledger for OpenAI background-response webhooks, plus the
-- service-role grants the server needs to drive the run lifecycle.

create table public.webhook_events (
  event_id text primary key,
  run_id uuid references public.analysis_runs(id) on delete set null,
  event_type text not null,
  received_at timestamptz not null default now()
);

create index webhook_events_run_idx on public.webhook_events(run_id);

alter table public.webhook_events enable row level security;

-- RLS on with no policies denies anon/authenticated; revoke grants as defense
-- in depth. The webhook handler runs as service_role and records events here.
revoke all on public.webhook_events from anon, authenticated;
grant select, insert on public.webhook_events to service_role;

-- The webhook and GET reconciliation run server-side as service_role (secret
-- key) and must read run context and flip lifecycle states. M2 granted
-- authenticated read access and service_role RPC execution, but not service_role
-- table access, so the admin-client status writes (fail / mark in progress) had
-- no privilege. Grant the minimal set. Transactional completion still flows
-- through complete_analysis_run(); this covers reads plus the queued ->
-- in_progress and -> failed status flips.
grant select on public.documents to service_role;
grant select, update on public.analysis_runs to service_role;
