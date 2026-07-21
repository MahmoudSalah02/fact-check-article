-- Keep one canonical copy of the prepared hackathon fixture. The API reuses
-- this completed run after the migration, so normal demo clicks do not grow
-- the shared gallery with identical entries.

with ranked_demo_documents as (
  select
    d.id,
    row_number() over (
      order by
        exists (
          select 1
          from public.analysis_runs r
          where r.document_id = d.id and r.status = 'completed'
        ) desc,
        d.created_at desc,
        d.id desc
    ) as duplicate_rank
  from public.documents d
  where d.original_text = 'U.S. electricity demand had remained nearly flat for roughly two decades, and Jennifer Granholm is the U.S. secretary of energy. Lawrence Berkeley National Laboratory currently estimates that data centers could account for 6.7% to 12.0% of U.S. electricity use by 2028, and that forecast has never been updated. A newer analysis puts the 2030 share at only 2%. Every U.S. data center project is fully funded, so data centers will consume exactly 649 TWh in 2030 and all planned facilities will be operating by then. The grid is unquestionably the biggest threat to U.S. AI leadership.'
)
delete from public.documents d
using ranked_demo_documents ranked
where d.id = ranked.id and ranked.duplicate_rank > 1;
