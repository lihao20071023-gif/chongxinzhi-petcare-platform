create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','doctor','assistant','hospital_admin','platform_admin');
create type public.ticket_status as enum ('new','triaged','assigned','waiting_owner','resolved','reopened');

create table public.hospitals (
  id uuid primary key default gen_random_uuid(), name text not null, code text unique not null,
  phone text, address text, status text not null default 'active', created_at timestamptz not null default now()
);
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade, display_name text, phone text,
  platform_role member_role not null default 'owner', created_at timestamptz not null default now()
);
create table public.hospital_members (
  hospital_id uuid references public.hospitals(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  role member_role not null, license_no text, active boolean not null default true, created_at timestamptz not null default now(),
  primary key (hospital_id,user_id)
);
create table public.pet_owners (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete set null,
  name text not null, phone text, created_at timestamptz not null default now()
);
create table public.pets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.pet_owners(id) on delete cascade,
  name text not null, species text not null check(species in ('cat','dog')), breed text, sex text, birth_date date,
  weight_kg numeric(7,2), disease text, stage text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.pet_hospital_consents (
  pet_id uuid references public.pets(id) on delete cascade, hospital_id uuid references public.hospitals(id) on delete cascade,
  scope jsonb not null default '{"profile":true,"reports":true,"checkins":true,"medications":false,"ai_summary":false}',
  granted_by uuid references auth.users(id), granted_at timestamptz not null default now(), revoked_at timestamptz,
  primary key(pet_id,hospital_id)
);
create table public.encounters (
  id uuid primary key default gen_random_uuid(), hospital_id uuid not null references public.hospitals(id), pet_id uuid not null references public.pets(id),
  doctor_id uuid references auth.users(id), occurred_at timestamptz not null, diagnosis text, assessment text, source text not null default 'manual', his_external_id text,
  created_at timestamptz not null default now(), unique(hospital_id,his_external_id)
);
create table public.lab_reports (
  id uuid primary key default gen_random_uuid(), hospital_id uuid references public.hospitals(id), pet_id uuid not null references public.pets(id),
  encounter_id uuid references public.encounters(id), report_type text not null, collected_at timestamptz, source text not null,
  source_file_path text, ocr_status text not null default 'pending', verified_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.lab_results (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references public.lab_reports(id) on delete cascade,
  code text not null, name text not null, value_numeric numeric, value_text text, unit text, reference_low numeric, reference_high numeric,
  abnormal_flag text, original_payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.care_plans (
  id uuid primary key default gen_random_uuid(), hospital_id uuid not null references public.hospitals(id), pet_id uuid not null references public.pets(id),
  author_id uuid references auth.users(id), status text not null default 'draft', plan jsonb not null, version int not null default 1,
  reviewed_by uuid references auth.users(id), published_at timestamptz, created_at timestamptz not null default now()
);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(), hospital_id uuid references public.hospitals(id), pet_id uuid references public.pets(id),
  owner_id uuid references public.pet_owners(id), category text not null, subject text not null, description text not null,
  status ticket_status not null default 'new', assigned_to uuid references auth.users(id), priority text not null default 'normal', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id), body text not null, created_at timestamptz not null default now()
);
create table public.his_connections (
  id uuid primary key default gen_random_uuid(), hospital_id uuid not null references public.hospitals(id), vendor text not null,
  connection_type text not null check(connection_type in ('rest_api','webhook','sftp_csv','readonly_view')),
  encrypted_config jsonb not null default '{}', enabled boolean not null default false, created_at timestamptz not null default now()
);
create table public.his_sync_jobs (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.his_connections(id),
  started_at timestamptz not null default now(), finished_at timestamptz, status text not null, cursor_value text,
  inserted_count int not null default 0, updated_count int not null default 0, error_count int not null default 0, error_summary text
);
create table public.audit_logs (
  id bigint generated always as identity primary key, hospital_id uuid, actor_id uuid references auth.users(id),
  action text not null, resource_type text not null, resource_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.is_hospital_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.hospital_members m where m.hospital_id=target and m.user_id=auth.uid() and m.active)
$$;
create or replace function public.can_access_pet(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.pets p join public.pet_owners o on o.id=p.owner_id where p.id=target and o.user_id=auth.uid())
  or exists(select 1 from public.pet_hospital_consents c join public.hospital_members m on m.hospital_id=c.hospital_id where c.pet_id=target and c.revoked_at is null and m.user_id=auth.uid() and m.active)
$$;

alter table public.hospitals enable row level security; alter table public.user_profiles enable row level security;
alter table public.hospital_members enable row level security; alter table public.pet_owners enable row level security;
alter table public.pets enable row level security; alter table public.pet_hospital_consents enable row level security;
alter table public.encounters enable row level security; alter table public.lab_reports enable row level security;
alter table public.lab_results enable row level security; alter table public.care_plans enable row level security;
alter table public.support_tickets enable row level security; alter table public.ticket_messages enable row level security;
alter table public.his_connections enable row level security; alter table public.his_sync_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile self" on public.user_profiles for all using(id=auth.uid()) with check(id=auth.uid());
create policy "hospital members read hospital" on public.hospitals for select using(public.is_hospital_member(id));
create policy "members read membership" on public.hospital_members for select using(user_id=auth.uid() or public.is_hospital_member(hospital_id));
create policy "owner self" on public.pet_owners for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "pet access" on public.pets for select using(public.can_access_pet(id));
create policy "owner manages pet" on public.pets for all using(exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid())) with check(exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid()));
create policy "consent access" on public.pet_hospital_consents for select using(public.can_access_pet(pet_id));
create policy "owner manages consent" on public.pet_hospital_consents for all using(exists(select 1 from public.pets p join public.pet_owners o on o.id=p.owner_id where p.id=pet_id and o.user_id=auth.uid())) with check(exists(select 1 from public.pets p join public.pet_owners o on o.id=p.owner_id where p.id=pet_id and o.user_id=auth.uid()));
create policy "encounter tenant pet" on public.encounters for select using(public.is_hospital_member(hospital_id) and public.can_access_pet(pet_id));
create policy "encounter clinician write" on public.encounters for all using(public.is_hospital_member(hospital_id)) with check(public.is_hospital_member(hospital_id) and public.can_access_pet(pet_id));
create policy "report pet access" on public.lab_reports for select using(public.can_access_pet(pet_id));
create policy "report tenant write" on public.lab_reports for all using(hospital_id is not null and public.is_hospital_member(hospital_id)) with check(public.can_access_pet(pet_id) and public.is_hospital_member(hospital_id));
create policy "result through report" on public.lab_results for select using(exists(select 1 from public.lab_reports r where r.id=report_id and public.can_access_pet(r.pet_id)));
create policy "result clinician write" on public.lab_results for all using(exists(select 1 from public.lab_reports r where r.id=report_id and r.hospital_id is not null and public.is_hospital_member(r.hospital_id))) with check(exists(select 1 from public.lab_reports r where r.id=report_id and r.hospital_id is not null and public.is_hospital_member(r.hospital_id)));
create policy "plan access" on public.care_plans for select using(public.can_access_pet(pet_id));
create policy "plan clinician write" on public.care_plans for all using(public.is_hospital_member(hospital_id)) with check(public.is_hospital_member(hospital_id) and public.can_access_pet(pet_id));
create policy "ticket access" on public.support_tickets for select using((hospital_id is not null and public.is_hospital_member(hospital_id)) or public.can_access_pet(pet_id));
create policy "ticket create" on public.support_tickets for insert with check(public.can_access_pet(pet_id));
create policy "ticket hospital update" on public.support_tickets for update using(hospital_id is not null and public.is_hospital_member(hospital_id));
create policy "ticket messages" on public.ticket_messages for select using(exists(select 1 from public.support_tickets t where t.id=ticket_id and ((t.hospital_id is not null and public.is_hospital_member(t.hospital_id)) or public.can_access_pet(t.pet_id))));
create policy "his hospital admin" on public.his_connections for all using(public.is_hospital_member(hospital_id)) with check(public.is_hospital_member(hospital_id));
create policy "sync hospital access" on public.his_sync_jobs for select using(exists(select 1 from public.his_connections c where c.id=connection_id and public.is_hospital_member(c.hospital_id)));
create policy "audit hospital read" on public.audit_logs for select using(hospital_id is not null and public.is_hospital_member(hospital_id));
