-- CRUD data contract for the single Node.js API service.

create table public.medical_cases (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  owner_id uuid not null references public.pet_owners(id) on delete restrict,
  pet_id uuid not null references public.pets(id) on delete cascade,
  primary_doctor_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  diagnosis text,
  disease_stage text,
  status text not null default 'active'
    check (status in ('draft','active','follow_up','closed','archived')),
  admitted_at timestamptz,
  discharged_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discharged_at is null or admitted_at is null or discharged_at >= admitted_at)
);

alter table public.care_plans
  add column case_id uuid references public.medical_cases(id) on delete cascade;

alter table public.care_tasks
  add column case_id uuid references public.medical_cases(id) on delete cascade;

alter table public.lab_reports
  add column uploaded_by uuid references auth.users(id) on delete set null;

create index medical_cases_hospital_status_updated_idx
  on public.medical_cases(hospital_id,status,updated_at desc);
create index medical_cases_owner_updated_idx
  on public.medical_cases(owner_id,updated_at desc);
create index medical_cases_pet_updated_idx
  on public.medical_cases(pet_id,updated_at desc);
create index medical_cases_primary_doctor_idx
  on public.medical_cases(primary_doctor_id);
create index care_plans_case_version_idx
  on public.care_plans(case_id,version desc)
  where case_id is not null;
create index care_tasks_case_status_start_idx
  on public.care_tasks(case_id,status,starts_on)
  where case_id is not null;
create index lab_reports_uploaded_by_idx
  on public.lab_reports(uploaded_by)
  where uploaded_by is not null;

create or replace function public.can_access_case(target_case uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.medical_cases c
    join public.pet_owners o on o.id = c.owner_id
    where c.id = target_case
      and (
        o.user_id = (select auth.uid())
        or (
          public.is_hospital_doctor(c.hospital_id)
          and exists (
            select 1 from public.pet_hospital_consents consent
            where consent.pet_id = c.pet_id
              and consent.hospital_id = c.hospital_id
              and consent.revoked_at is null
          )
        )
      )
  )
$$;

alter table public.medical_cases enable row level security;

create policy "case participants read" on public.medical_cases
  for select to authenticated
  using ((select public.can_access_case(id)));

create policy "hospital doctor creates case" on public.medical_cases
  for insert to authenticated
  with check (
    primary_doctor_id = (select auth.uid())
    and (select public.is_hospital_doctor(hospital_id))
    and exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = owner_id
    )
    and exists (
      select 1 from public.pet_hospital_consents consent
      where consent.pet_id = pet_id
        and consent.hospital_id = hospital_id
        and consent.revoked_at is null
    )
  );

create policy "hospital doctor updates case" on public.medical_cases
  for update to authenticated
  using ((select public.is_hospital_doctor(hospital_id)))
  with check (
    (select public.is_hospital_doctor(hospital_id))
    and exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = owner_id
    )
  );

create policy "hospital doctor deletes draft case" on public.medical_cases
  for delete to authenticated
  using (
    status = 'draft'
    and (select public.is_hospital_doctor(hospital_id))
  );

create policy "owner uploads own pet report" on public.lab_reports
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and source = 'owner_upload'
    and exists (
      select 1 from public.pets p
      join public.pet_owners o on o.id = p.owner_id
      where p.id = pet_id and o.user_id = (select auth.uid())
    )
  );

comment on table public.medical_cases is
  'Hospital-owned clinical case linked to one owner, pet and primary doctor. Owners have read-only access.';
