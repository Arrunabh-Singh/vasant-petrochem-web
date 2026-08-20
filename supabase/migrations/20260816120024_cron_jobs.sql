-- Phase 8: every scheduled job the wave promised. All sub-daily
-- scheduling lives here, not in Vercel cron (Hobby plan = 1x/day) —
-- see VASANT_HUB_BLUEPRINT.md decision 2. The one Vercel cron entry
-- (vercel.json) bridges DB-only pg_cron to the Node-side notify()
-- Telegram/Resend fan-out once a day.

create extension if not exists pg_cron;

-- document-storage-hardening.md §2.3: guardrail against a bucket
-- accidentally flipped to public. Avoids re-alerting every night for an
-- already-open, unacked alert.
select cron.schedule('security-sweep-buckets', '0 3 * * *', $$
  insert into public.security_alerts (kind, detail, severity)
  select 'public_bucket', 'bucket is public: ' || id, 'critical'
  from storage.buckets b
  where b.public
    and not exists (
      select 1 from public.security_alerts a
      where a.kind = 'public_bucket' and a.detail = 'bucket is public: ' || b.id and a.acked_at is null
    );
$$);

-- document-storage-hardening.md §4.4: expired, non-legal-hold documents
-- move to quarantine (never immediate purge — an approver still has to
-- act on quarantined docs, see §4.4 "purge requires an approver click").
select cron.schedule('retention-quarantine', '0 2 * * *', $$
  update public.documents
     set status = 'quarantined'
   where status in ('active', 'superseded', 'pending')
     and legal_hold = false
     and retention_until < current_date;
$$);

-- FEATURE_BACKLOG.md A7/A8/A9: surface compliance items inside their
-- warning window (30 days) once per day, not once per item per day.
select cron.schedule('compliance-expiry-scan', '0 4 * * *', $$
  insert into public.security_alerts (kind, detail, severity)
  select 'compliance_due',
    label || ' (' || kind || ') expires ' || expires_on || ' — owner: ' || owner_email,
    case when expires_on < current_date then 'critical' when expires_on - current_date <= 7 then 'critical' else 'warning' end
  from public.compliance_items
  where status = 'active'
    and expires_on - current_date <= 30
    and not exists (
      select 1 from public.security_alerts a
      where a.kind = 'compliance_due'
        and a.detail like '%' || label || '%'
        and a.created_at::date = current_date
    );
$$);

-- decision 7: 1m rolls up to 1h rolls up to 1d; only 1m has a retention
-- purge (30 days — enough for a detailed recent view; 1h/1d are the
-- long-lived aggregates, kept forever, matching blueprint §2.4 "raw 90
-- days, agg forever" applied to this wave's coarser "raw" tier).
select cron.schedule('telemetry-rollup-1h', '5 * * * *', $$
  insert into iot.telemetry_1h (device_id, period_start, avg, min, max, last)
  select
    device_id,
    date_trunc('hour', period_start) as period_start,
    avg(avg) as avg,
    min(min) as min,
    max(max) as max,
    (array_agg(last order by period_start desc))[1] as last
  from iot.telemetry_1m
  where period_start >= now() - interval '2 hours'
    and period_start < date_trunc('hour', now())
  group by device_id, date_trunc('hour', period_start)
  on conflict (device_id, period_start) do update
    set avg = excluded.avg, min = excluded.min, max = excluded.max, last = excluded.last;
$$);

select cron.schedule('telemetry-rollup-1d', '10 0 * * *', $$
  insert into iot.telemetry_1d (device_id, period_start, avg, min, max, last)
  select
    device_id,
    date_trunc('day', period_start) as period_start,
    avg(avg) as avg,
    min(min) as min,
    max(max) as max,
    (array_agg(last order by period_start desc))[1] as last
  from iot.telemetry_1h
  where period_start >= now() - interval '2 days'
    and period_start < date_trunc('day', now())
  group by device_id, date_trunc('day', period_start)
  on conflict (device_id, period_start) do update
    set avg = excluded.avg, min = excluded.min, max = excluded.max, last = excluded.last;
$$);

select cron.schedule('telemetry-1m-purge', '15 0 * * *', $$
  delete from iot.telemetry_1m where period_start < now() - interval '30 days';
$$);

-- Weekly download digest per document-storage-hardening.md §3.3 — "the
-- family's early-warning radar for T4/T9" — one alert row summarizing
-- the week, read by the daily digest bridge below.
select cron.schedule('weekly-download-digest', '0 8 * * 1', $$
  insert into public.security_alerts (kind, detail, severity)
  select 'weekly_digest',
    count(*) || ' document downloads in the last 7 days across ' || count(distinct actor_email) || ' users',
    'info'
  from public.audit_log
  where object_type = 'document' and action = 'download_ok' and created_at >= now() - interval '7 days'
  having count(*) > 0;
$$);
