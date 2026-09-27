-- One WeChat mini program, one API and one shared database.
-- The public API exposes roles as pet_owner / doctor / admin while the
-- existing database enum keeps owner / doctor / platform_admin.

create table public.wechat_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  openid_hash text not null unique,
  unionid_hash text unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

alter table public.role_applications
  add column hospital_id uuid references public.hospitals(id) on delete set null,
  add column requested_hospital jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'role_applications_hospital_choice_check'
      and conrelid = 'public.role_applications'::regclass
  ) then
    alter table public.role_applications
      add constraint role_applications_hospital_choice_check
      check (hospital_id is not null or requested_hospital is not null) not valid;
  end if;
end $$;

create table public.health_checkins (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  weight_kg numeric(7,2),
  water_ml numeric(9,2),
  appetite text,
  spirit text,
  urine_note text,
  stool_note text,
  vomiting_count integer not null default 0 check (vomiting_count >= 0),
  symptom_note text,
  photo_paths text[] not null default '{}',
  source text not null default 'owner_manual'
    check (source in ('owner_manual','doctor_entry','verified_device')),
  created_at timestamptz not null default now()
);

create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.care_plans(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  instruction text not null,
  task_type text not null check (task_type in ('medication','feeding','hydration','monitoring','activity','other')),
  schedule jsonb not null default '{}',
  starts_on date not null,
  ends_on date,
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.care_task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.care_tasks(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  completed_by uuid not null references auth.users(id) on delete restrict,
  scheduled_for timestamptz not null,
  status text not null check (status in ('completed','missed','skipped','problem')),
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, scheduled_for)
);

create table public.follow_up_reminders (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz not null,
  reason text not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','completed','cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  species text not null check (species in ('cat','dog','both')),
  disease text not null,
  stage text,
  scenario text not null,
  trigger_terms text[] not null default '{}',
  core_conclusion text not null,
  applicability text not null,
  owner_explanation text not null,
  next_action text not null,
  forbidden_inference text not null,
  source_title text not null,
  source_organization text,
  source_year integer,
  source_url text,
  review_status text not null default 'draft' check (review_status in ('draft','in_review','approved','retired')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_due_on date,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index role_applications_applicant_status_idx
  on public.role_applications(applicant_id,status,created_at desc);
create index role_applications_hospital_status_idx
  on public.role_applications(hospital_id,status,created_at desc)
  where hospital_id is not null;
create index health_checkins_pet_time_idx
  on public.health_checkins(pet_id,recorded_at desc);
create index health_checkins_recorded_by_idx
  on public.health_checkins(recorded_by);
create index care_tasks_pet_status_start_idx
  on public.care_tasks(pet_id,status,starts_on);
create index care_tasks_hospital_status_idx
  on public.care_tasks(hospital_id,status,updated_at desc);
create index care_tasks_plan_idx on public.care_tasks(care_plan_id);
create index care_tasks_created_by_idx on public.care_tasks(created_by);
create index care_task_completions_pet_time_idx
  on public.care_task_completions(pet_id,scheduled_for desc);
create index care_task_completions_task_idx on public.care_task_completions(task_id);
create index care_task_completions_completed_by_idx on public.care_task_completions(completed_by);
create index follow_up_reminders_hospital_status_due_idx
  on public.follow_up_reminders(hospital_id,status,due_at);
create index follow_up_reminders_pet_due_idx
  on public.follow_up_reminders(pet_id,due_at desc);
create index follow_up_reminders_created_by_idx on public.follow_up_reminders(created_by);
create index knowledge_entries_review_disease_idx
  on public.knowledge_entries(review_status,disease,species);
create index knowledge_entries_trigger_terms_idx
  on public.knowledge_entries using gin(trigger_terms);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case p.platform_role
    when 'doctor' then 'doctor'
    when 'platform_admin' then 'admin'
    else 'pet_owner'
  end
  from public.user_profiles p
  where p.id = (select auth.uid())
$$;

create or replace function public.is_hospital_doctor(target_hospital uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hospital_members m
    where m.hospital_id = target_hospital
      and m.user_id = (select auth.uid())
      and m.active = true
      and m.role in ('doctor','hospital_admin')
  )
$$;

alter table public.wechat_identities enable row level security;
alter table public.health_checkins enable row level security;
alter table public.care_tasks enable row level security;
alter table public.care_task_completions enable row level security;
alter table public.follow_up_reminders enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.system_settings enable row level security;

-- WeChat identity rows are only read by the server-side API service role.

create policy "checkin participants read" on public.health_checkins
  for select to authenticated
  using ((select public.can_access_pet(pet_id)));
create policy "owner records checkin" on public.health_checkins
  for insert to authenticated
  with check (
    recorded_by = (select auth.uid())
    and exists (
      select 1 from public.pets p
      join public.pet_owners o on o.id = p.owner_id
      where p.id = pet_id and o.user_id = (select auth.uid())
    )
  );

create policy "care task participants read" on public.care_tasks
  for select to authenticated
  using ((select public.can_access_pet(pet_id)));
create policy "hospital doctor manages care tasks" on public.care_tasks
  for all to authenticated
  using ((select public.is_hospital_doctor(hospital_id)))
  with check (
    (select public.is_hospital_doctor(hospital_id))
    and created_by = (select auth.uid())
    and (select public.can_access_pet(pet_id))
  );

create policy "completion participants read" on public.care_task_completions
  for select to authenticated
  using ((select public.can_access_pet(pet_id)));
create policy "owner records task completion" on public.care_task_completions
  for insert to authenticated
  with check (
    completed_by = (select auth.uid())
    and exists (
      select 1 from public.pets p
      join public.pet_owners o on o.id = p.owner_id
      where p.id = pet_id and o.user_id = (select auth.uid())
    )
  );
create policy "owner updates own task completion" on public.care_task_completions
  for update to authenticated
  using (
    completed_by = (select auth.uid())
    and exists (
      select 1 from public.pets p
      join public.pet_owners o on o.id = p.owner_id
      where p.id = pet_id and o.user_id = (select auth.uid())
    )
  )
  with check (
    completed_by = (select auth.uid())
    and exists (
      select 1 from public.pets p
      join public.pet_owners o on o.id = p.owner_id
      where p.id = pet_id and o.user_id = (select auth.uid())
    )
  );

create policy "followup participants read" on public.follow_up_reminders
  for select to authenticated
  using ((select public.can_access_pet(pet_id)));
create policy "hospital doctor manages followups" on public.follow_up_reminders
  for all to authenticated
  using ((select public.is_hospital_doctor(hospital_id)))
  with check (
    (select public.is_hospital_doctor(hospital_id))
    and created_by = (select auth.uid())
    and (select public.can_access_pet(pet_id))
  );

create policy "approved knowledge readable" on public.knowledge_entries
  for select to authenticated
  using (review_status = 'approved' or (select public.is_platform_admin()));
create policy "admin manages knowledge" on public.knowledge_entries
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "admin manages settings" on public.system_settings
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create or replace function public.review_doctor_application(
  application_id uuid,
  approve boolean,
  note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.role_applications%rowtype;
  resolved_hospital_id uuid;
  requested_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  select * into application
  from public.role_applications
  where id = application_id
  for update;

  if not found or application.requested_role <> 'doctor' then
    raise exception 'doctor application not found';
  end if;
  if application.status <> 'pending' then
    raise exception 'application is not pending';
  end if;

  if not approve then
    update public.role_applications
    set status = 'rejected', review_note = note, reviewed_by = (select auth.uid()),
        reviewed_at = now(), updated_at = now()
    where id = application_id;
    return null;
  end if;

  resolved_hospital_id := application.hospital_id;
  if resolved_hospital_id is null then
    requested_name := nullif(application.requested_hospital ->> 'name', '');
    if requested_name is null then raise exception 'requested hospital name missing'; end if;
    insert into public.hospitals(name,code,address,status)
    values (
      requested_name,
      'PENDING-' || replace(gen_random_uuid()::text,'-',''),
      application.requested_hospital ->> 'address',
      'pending_review'
    )
    returning id into resolved_hospital_id;
  end if;

  insert into public.hospital_members(hospital_id,user_id,role,license_no,active)
  values (resolved_hospital_id,application.applicant_id,'doctor',application.license_no,true)
  on conflict (hospital_id,user_id) do update
    set role = excluded.role, license_no = excluded.license_no, active = true;

  update public.role_applications
  set hospital_id = resolved_hospital_id, status = 'approved', review_note = note,
      reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
  where id = application_id;

  return resolved_hospital_id;
end;
$$;

comment on table public.health_checkins is
  'Cloud source of truth for owner-entered or verified-device home monitoring records.';
comment on table public.care_tasks is
  'Doctor-authored tasks derived from a published care plan; AI may format but cannot publish them.';
comment on table public.knowledge_entries is
  'Versioned, reviewable RAG source records. Only approved entries are available to non-admin users.';
