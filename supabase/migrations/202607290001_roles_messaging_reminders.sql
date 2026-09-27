create type public.verification_status as enum ('draft','pending','approved','rejected','suspended');
create type public.conversation_sender_role as enum ('owner','doctor','hospital_admin');

create table public.role_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  requested_role public.member_role not null check (requested_role in ('doctor','hospital_admin')),
  legal_name text not null,
  phone text not null,
  organization_name text not null,
  license_no text not null,
  credential_paths text[] not null default '{}',
  status public.verification_status not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_conversations (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.pet_owners(id) on delete cascade,
  assigned_doctor_id uuid references auth.users(id),
  status text not null default 'open' check (status in ('open','waiting_owner','waiting_clinic','closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hospital_id,pet_id)
);

create table public.care_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.care_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  sender_role public.conversation_sender_role not null,
  body text not null check (char_length(body) between 1 and 5000),
  attachment_paths text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.medication_orders (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id),
  pet_id uuid not null references public.pets(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  medication_name text not null,
  instruction text not null,
  dose_text text not null,
  frequency_text text not null,
  starts_on date not null,
  ends_on date,
  status text not null default 'draft' check (status in ('draft','published','stopped','completed')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.medication_reminders (
  id uuid primary key default gen_random_uuid(),
  medication_order_id uuid not null references public.medication_orders(id) on delete cascade,
  owner_id uuid not null references public.pet_owners(id) on delete cascade,
  scheduled_at timestamptz not null,
  delivery_status text not null default 'scheduled' check (delivery_status in ('scheduled','sent','failed','cancelled')),
  acknowledged_at timestamptz,
  adherence_status text check (adherence_status in ('taken','missed','skipped','vomited')),
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.platform_role='platform_admin')
$$;

alter table public.role_applications enable row level security;
alter table public.care_conversations enable row level security;
alter table public.care_messages enable row level security;
alter table public.medication_orders enable row level security;
alter table public.medication_reminders enable row level security;

create policy "applicant manages own application" on public.role_applications
  for all using(applicant_id=auth.uid()) with check(applicant_id=auth.uid() and status in ('draft','pending'));
create policy "platform reviews applications" on public.role_applications
  for all using(public.is_platform_admin()) with check(public.is_platform_admin());

create policy "conversation participants read" on public.care_conversations for select
  using(public.can_access_pet(pet_id) and (public.is_hospital_member(hospital_id) or exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid())));
create policy "hospital creates conversation" on public.care_conversations for insert
  with check(public.is_hospital_member(hospital_id) and public.can_access_pet(pet_id));
create policy "participants update conversation" on public.care_conversations for update
  using(public.is_hospital_member(hospital_id) or exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid()));

create policy "conversation messages read" on public.care_messages for select
  using(exists(select 1 from public.care_conversations c where c.id=conversation_id and public.can_access_pet(c.pet_id)));
create policy "conversation participants send" on public.care_messages for insert
  with check(sender_id=auth.uid() and exists(select 1 from public.care_conversations c where c.id=conversation_id and public.can_access_pet(c.pet_id)));

create policy "medication order participants read" on public.medication_orders for select using(public.can_access_pet(pet_id));
create policy "verified hospital writes medication order" on public.medication_orders for all
  using(public.is_hospital_member(hospital_id)) with check(public.is_hospital_member(hospital_id) and author_id=auth.uid() and public.can_access_pet(pet_id));
create policy "owner reads reminders" on public.medication_reminders for select
  using(exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid()));
create policy "owner acknowledges reminders" on public.medication_reminders for update
  using(exists(select 1 from public.pet_owners o where o.id=owner_id and o.user_id=auth.uid()));
create policy "hospital schedules reminders" on public.medication_reminders for insert
  with check(exists(select 1 from public.medication_orders m where m.id=medication_order_id and public.is_hospital_member(m.hospital_id)));

