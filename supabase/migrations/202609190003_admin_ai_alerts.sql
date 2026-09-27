-- Admin operations, daily activity and reviewable AI/rule alerts.

create table public.daily_user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  app_role text not null check (app_role in ('pet_owner','doctor','admin')),
  request_count integer not null default 1 check (request_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  case_id uuid references public.medical_cases(id) on delete set null,
  checkin_id uuid not null unique references public.health_checkins(id) on delete cascade,
  severity text not null check (severity in ('info','warning','urgent')),
  title text not null,
  explanation text not null,
  owner_message text not null,
  recommended_action text not null,
  detection_source text not null check (detection_source in ('rule_engine','ai_assisted')),
  evidence jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index daily_user_activity_date_role_idx
  on public.daily_user_activity(activity_date, app_role);
create index health_alerts_pet_status_time_idx
  on public.health_alerts(pet_id, status, created_at desc);
create index health_alerts_case_status_time_idx
  on public.health_alerts(case_id, status, created_at desc)
  where case_id is not null;

alter table public.daily_user_activity enable row level security;
alter table public.health_alerts enable row level security;

create policy "user reads own activity" on public.daily_user_activity
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

create policy "participants read health alerts" on public.health_alerts
  for select to authenticated
  using ((select public.can_access_pet(pet_id)));

create policy "hospital doctor reviews health alerts" on public.health_alerts
  for update to authenticated
  using (
    case_id is not null
    and exists (
      select 1 from public.medical_cases c
      where c.id = case_id and (select public.is_hospital_doctor(c.hospital_id))
    )
  )
  with check (
    case_id is not null
    and exists (
      select 1 from public.medical_cases c
      where c.id = case_id and (select public.is_hospital_doctor(c.hospital_id))
    )
  );

insert into public.system_settings(key, value, description)
values
  ('ai_safety_rules', jsonb_build_object(
    'noDiagnosis', true,
    'noMedicationChange', true,
    'urgentEscalation', true,
    'requireKnowledgeSources', true,
    'message', 'AI不独立诊断、不新增或调整药物；异常情况必须建议联系兽医或及时就医。'
  ), 'AI回答、医嘱拆解和异常分析共用的安全边界'),
  ('reminder_rules', jsonb_build_object(
    'missedTaskHours', 2,
    'consecutiveMissedTasks', 2,
    'weightChangePercent', 5,
    'waterChangePercent', 50,
    'vomitingUrgentCount', 3,
    'doctorReviewUrgent', true
  ), '院后护理打卡异常和提醒阈值')
on conflict (key) do nothing;

comment on table public.daily_user_activity is
  'One row per authenticated user per day; used for real DAU instead of invented dashboard metrics.';
comment on table public.health_alerts is
  'Reviewable home-monitoring alerts. Alerts are not diagnoses and never change medication or care plans.';
