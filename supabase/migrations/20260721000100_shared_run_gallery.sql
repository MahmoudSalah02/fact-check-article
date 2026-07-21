-- Hackathon gallery: every invisible anonymous session can read completed work.
-- Writes remain restricted to the existing RPCs and each viewer keeps their
-- own accept/reject decisions.

drop policy documents_select_own on public.documents;
create policy documents_select_shared on public.documents
for select to authenticated
using (true);

drop policy analysis_runs_select_own on public.analysis_runs;
create policy analysis_runs_select_shared on public.analysis_runs
for select to authenticated
using (true);

drop policy findings_select_own on public.findings;
create policy findings_select_shared on public.findings
for select to authenticated
using (true);

drop policy sources_select_own on public.sources;
create policy sources_select_shared on public.sources
for select to authenticated
using (true);

alter table public.edit_decisions
drop constraint edit_decisions_pkey;

alter table public.edit_decisions
add primary key (finding_id, user_id);

create or replace function public.set_finding_decision(
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
    select 1 from public.findings f where f.id = p_finding_id
  ) then
    return;
  end if;

  return query
  insert into public.edit_decisions(finding_id, user_id, decision)
  values (p_finding_id, v_user_id, p_decision)
  on conflict on constraint edit_decisions_pkey do update
    set decision = excluded.decision, decided_at = now()
  returning edit_decisions.finding_id, edit_decisions.decision, edit_decisions.decided_at;
end;
$$;
