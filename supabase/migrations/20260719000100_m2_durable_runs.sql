create type public.run_status as enum ('queued', 'in_progress', 'completed', 'failed');
create type public.claim_type as enum ('fact', 'forecast', 'opinion');
create type public.finding_verdict as enum (
  'verified', 'outdated', 'contradicted', 'unsupported',
  'needs_context', 'unresolved', 'opinion'
);
create type public.forecast_status as enum (
  'pending', 'on_track', 'revised', 'fulfilled', 'missed', 'not_measurable'
);
create type public.confidence_level as enum ('high', 'medium', 'low');
create type public.edit_decision_value as enum ('accepted', 'rejected', 'restored');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text check (title is null or (char_length(btrim(title)) between 1 and 200)),
  original_text text not null check (char_length(original_text) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  status public.run_status not null default 'queued',
  checked_at date not null,
  model text,
  provider_response_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_runs_error_state check (
    (status = 'failed' and error_code is not null)
    or (status <> 'failed' and error_code is null)
  )
);

create table public.findings (
  id uuid primary key,
  run_id uuid not null references public.analysis_runs(id) on delete cascade,
  source_text text not null check (char_length(source_text) between 1 and 20000),
  prefix_text text check (prefix_text is null or char_length(prefix_text) <= 200),
  suffix_text text check (suffix_text is null or char_length(suffix_text) <= 200),
  claim_type public.claim_type not null,
  verdict public.finding_verdict not null,
  forecast_status public.forecast_status,
  confidence public.confidence_level not null,
  explanation text not null check (char_length(btrim(explanation)) between 1 and 1000),
  replacement text check (replacement is null or char_length(replacement) between 1 and 20000),
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset > start_offset),
  created_at timestamptz not null default now(),
  constraint findings_forecast_state check (
    (claim_type = 'forecast' and forecast_status is not null)
    or (claim_type <> 'forecast' and forecast_status is null)
  ),
  constraint findings_opinion_state check (
    (claim_type = 'opinion') = (verdict = 'opinion')
  ),
  constraint findings_unique_span unique (run_id, start_offset, end_offset)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  ordinal smallint not null check (ordinal >= 0),
  url text not null check (url ~ '^https://'),
  title text not null check (char_length(btrim(title)) between 1 and 500),
  publisher text check (publisher is null or char_length(btrim(publisher)) between 1 and 200),
  published_at date,
  constraint sources_finding_ordinal_key unique (finding_id, ordinal)
);

create table public.edit_decisions (
  finding_id uuid primary key references public.findings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision public.edit_decision_value not null,
  decided_at timestamptz not null default now()
);

create index documents_user_created_idx on public.documents(user_id, created_at desc);
create index analysis_runs_document_idx on public.analysis_runs(document_id);
create index findings_run_idx on public.findings(run_id);
create index sources_finding_idx on public.sources(finding_id);
create index edit_decisions_user_idx on public.edit_decisions(user_id);

create function public.reject_original_text_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.original_text is distinct from old.original_text then
    raise exception 'document original_text is immutable' using errcode = '22000';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_original_text_immutable
before update on public.documents
for each row execute function public.reject_original_text_change();

alter table public.documents enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.findings enable row level security;
alter table public.sources enable row level security;
alter table public.edit_decisions enable row level security;

create policy documents_select_own on public.documents
for select to authenticated
using ((select auth.uid()) = user_id);

create policy analysis_runs_select_own on public.analysis_runs
for select to authenticated
using (exists (
  select 1 from public.documents d
  where d.id = analysis_runs.document_id and d.user_id = (select auth.uid())
));

create policy findings_select_own on public.findings
for select to authenticated
using (exists (
  select 1
  from public.analysis_runs r
  join public.documents d on d.id = r.document_id
  where r.id = findings.run_id and d.user_id = (select auth.uid())
));

create policy sources_select_own on public.sources
for select to authenticated
using (exists (
  select 1
  from public.findings f
  join public.analysis_runs r on r.id = f.run_id
  join public.documents d on d.id = r.document_id
  where f.id = sources.finding_id and d.user_id = (select auth.uid())
));

create policy edit_decisions_select_own on public.edit_decisions
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.documents, public.analysis_runs, public.findings, public.sources, public.edit_decisions to authenticated;

create function public.create_analysis_run(
  p_original_text text,
  p_checked_at date,
  p_title text default null
)
returns table(document_id uuid, run_id uuid, status public.run_status, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_document_id uuid;
  v_run_id uuid;
  v_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.documents(user_id, title, original_text)
  values (v_user_id, p_title, p_original_text)
  returning id into v_document_id;

  insert into public.analysis_runs(document_id, checked_at)
  values (v_document_id, p_checked_at)
  returning id, analysis_runs.created_at into v_run_id, v_created_at;

  return query select v_document_id, v_run_id, 'queued'::public.run_status, v_created_at;
end;
$$;

create function public.complete_analysis_run(
  p_run_id uuid,
  p_model text,
  p_provider_response_id text,
  p_findings jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_finding jsonb;
  v_source jsonb;
  v_finding_id uuid;
  v_source_ordinal integer;
begin
  if jsonb_typeof(p_findings) <> 'array' or jsonb_array_length(p_findings) > 25 then
    raise exception 'findings must be an array with at most 25 items' using errcode = '22023';
  end if;

  perform 1 from public.analysis_runs
  where id = p_run_id and status in ('queued', 'in_progress')
  for update;
  if not found then
    raise exception 'run is missing or terminal' using errcode = 'P0002';
  end if;

  for v_finding in select value from jsonb_array_elements(p_findings)
  loop
    v_finding_id := (v_finding->>'id')::uuid;
    insert into public.findings(
      id, run_id, source_text, prefix_text, suffix_text, claim_type, verdict,
      forecast_status, confidence, explanation, replacement, start_offset, end_offset
    ) values (
      v_finding_id,
      p_run_id,
      v_finding->>'sourceText',
      v_finding->>'prefixText',
      v_finding->>'suffixText',
      (v_finding->>'claimType')::public.claim_type,
      (v_finding->>'verdict')::public.finding_verdict,
      case when v_finding->>'forecastStatus' is null then null else (v_finding->>'forecastStatus')::public.forecast_status end,
      (v_finding->>'confidence')::public.confidence_level,
      v_finding->>'explanation',
      v_finding->>'replacement',
      (v_finding->>'startOffset')::integer,
      (v_finding->>'endOffset')::integer
    );

    v_source_ordinal := 0;
    for v_source in select value from jsonb_array_elements(v_finding->'sources')
    loop
      insert into public.sources(finding_id, ordinal, url, title, publisher, published_at)
      values (
        v_finding_id,
        v_source_ordinal,
        v_source->>'url',
        v_source->>'title',
        v_source->>'publisher',
        case when v_source->>'publishedAt' is null then null else (v_source->>'publishedAt')::date end
      );
      v_source_ordinal := v_source_ordinal + 1;
    end loop;
  end loop;

  update public.analysis_runs
  set status = 'completed', model = p_model,
      provider_response_id = p_provider_response_id, updated_at = now()
  where id = p_run_id;
end;
$$;

create function public.set_finding_decision(
  p_finding_id uuid,
  p_decision public.edit_decision_value
)
returns table(finding_id uuid, decision public.edit_decision_value, decided_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1
    from public.findings f
    join public.analysis_runs r on r.id = f.run_id
    join public.documents d on d.id = r.document_id
    where f.id = p_finding_id and d.user_id = v_user_id
  ) then
    return;
  end if;

  return query
  insert into public.edit_decisions(finding_id, user_id, decision)
  values (p_finding_id, v_user_id, p_decision)
  on conflict on constraint edit_decisions_pkey do update
    set decision = excluded.decision, decided_at = now()
    where public.edit_decisions.user_id = v_user_id
  returning edit_decisions.finding_id, edit_decisions.decision, edit_decisions.decided_at;
end;
$$;

revoke all on function public.reject_original_text_change() from public, anon, authenticated;
revoke all on function public.create_analysis_run(text, date, text) from public, anon;
grant execute on function public.create_analysis_run(text, date, text) to authenticated;
revoke all on function public.complete_analysis_run(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_analysis_run(uuid, text, text, jsonb) to service_role;
revoke all on function public.set_finding_decision(uuid, public.edit_decision_value) from public, anon;
grant execute on function public.set_finding_decision(uuid, public.edit_decision_value) to authenticated;
