begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(
  instance_id, id, aud, role, is_anonymous,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true, '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', true, '{}', '{}', now(), now());

create temporary table gallery_test_ids(document_id uuid, run_id uuid);
grant select, insert on gallery_test_ids to authenticated, service_role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

insert into gallery_test_ids
select document_id, run_id
from public.create_analysis_run(
  p_original_text => 'A shared article',
  p_checked_at => '2026-07-21',
  p_title => 'Shared check'
);

set local role service_role;
select public.complete_analysis_run(
  (select run_id from gallery_test_ids),
  'fixture',
  'fixture:shared-gallery',
  jsonb_build_array(jsonb_build_object(
    'id', '43000000-0000-0000-0000-000000000003',
    'sourceText', 'A shared article',
    'prefixText', null,
    'suffixText', null,
    'claimType', 'fact',
    'verdict', 'verified',
    'forecastStatus', null,
    'confidence', 'high',
    'explanation', 'Verified in the shared gallery test.',
    'replacement', null,
    'startOffset', 0,
    'endOffset', 16,
    'sources', jsonb_build_array(jsonb_build_object(
      'url', 'https://example.com/shared',
      'title', 'Shared source',
      'publisher', 'Example',
      'publishedAt', null
    ))
  ))
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',
  true
);

select is((select count(*) from public.documents), 1::bigint, 'another session can read the shared document');
select is((select count(*) from public.analysis_runs), 1::bigint, 'another session can read the shared run');
select is((select count(*) from public.findings), 1::bigint, 'another session can read shared findings');
select is((select count(*) from public.sources), 1::bigint, 'another session can read shared sources');
select lives_ok(
  $$select * from public.set_finding_decision('43000000-0000-0000-0000-000000000003', 'accepted')$$,
  'another session can review a shared finding'
);
select is((select count(*) from public.edit_decisions), 1::bigint, 'the viewer can read their own decision');

select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

select is((select count(*) from public.edit_decisions), 0::bigint, 'decisions stay private to each viewer');
select throws_ok(
  $$update public.documents set title = 'tampered'$$,
  '42501',
  null,
  'shared readers still cannot update documents'
);

select * from finish();
rollback;
