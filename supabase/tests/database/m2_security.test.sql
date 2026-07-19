begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public', 'documents', 'documents table exists');
select has_table('public', 'analysis_runs', 'analysis_runs table exists');
select has_table('public', 'findings', 'findings table exists');
select has_table('public', 'sources', 'sources table exists');
select has_table('public', 'edit_decisions', 'edit_decisions table exists');

insert into auth.users(
  instance_id, id, aud, role, is_anonymous,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true, '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', true, '{}', '{}', now(), now());

create temporary table test_run_ids(document_id uuid, run_id uuid);
grant select, insert on test_run_ids to authenticated, service_role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

insert into test_run_ids
select document_id, run_id
from public.create_analysis_run(
  p_original_text => 'Original article',
  p_checked_at => '2026-07-18',
  p_title => 'Security test'
);

select is((select count(*) from public.documents), 1::bigint, 'owner can read their document');
select is((select count(*) from public.analysis_runs), 1::bigint, 'owner can read their run');

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',
  true
);

select is((select count(*) from public.documents), 0::bigint, 'other user cannot read the document');
select is((select count(*) from public.analysis_runs), 0::bigint, 'other user cannot read the run');
select throws_ok(
  $$update public.documents set title = 'tampered'$$,
  '42501',
  null,
  'authenticated users cannot update documents directly'
);

set local role service_role;
select public.complete_analysis_run(
  (select run_id from test_run_ids),
  'fixture',
  'fixture:m2-security',
  jsonb_build_array(jsonb_build_object(
    'id', '30000000-0000-0000-0000-000000000003',
    'sourceText', 'Original article',
    'prefixText', null,
    'suffixText', null,
    'claimType', 'fact',
    'verdict', 'verified',
    'forecastStatus', null,
    'confidence', 'high',
    'explanation', 'Verified in a deterministic database test.',
    'replacement', null,
    'startOffset', 0,
    'endOffset', 16,
    'sources', jsonb_build_array(jsonb_build_object(
      'url', 'https://example.com/source',
      'title', 'Example source',
      'publisher', 'Example',
      'publishedAt', null
    ))
  ))
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

select is((select count(*) from public.findings), 1::bigint, 'owner can read completed findings');
select is((select count(*) from public.sources), 1::bigint, 'owner can read completed sources');
select lives_ok(
  $$select * from public.set_finding_decision('30000000-0000-0000-0000-000000000003', 'accepted')$$,
  'owner can set a finding decision through the RPC'
);
select is((select decision::text from public.edit_decisions), 'accepted', 'decision is persisted');
select throws_ok(
  $$update public.documents set original_text = 'changed'$$,
  '42501',
  null,
  'original text cannot be updated by the owner'
);

select * from finish();
rollback;
