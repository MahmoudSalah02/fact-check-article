begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select has_table(
  'public',
  'webhook_events',
  'webhook_events table exists'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.webhook_events'::regclass),
  true,
  'webhook_events has row level security enabled'
);

-- The service role (used by the webhook handler) can write the ledger.
set local role service_role;
select lives_ok(
  $$insert into public.webhook_events(event_id, event_type)
    values ('evt_m3_test', 'response.completed')$$,
  'service role can record a webhook event'
);

-- Anonymous/authenticated users can never read or write the ledger.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);
select throws_ok(
  $$insert into public.webhook_events(event_id, event_type)
    values ('evt_denied', 'response.completed')$$,
  null,
  null,
  'authenticated users cannot write webhook_events'
);

select * from finish();
rollback;
