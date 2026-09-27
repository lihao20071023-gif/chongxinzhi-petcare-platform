-- Verified hospital discovery and clearly separated paid advertising.
-- The browser prototype uses localStorage; these tables are the production data contract.

create table public.hospital_public_profiles (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null unique references public.hospitals(id) on delete cascade,
  display_name text not null,
  animal_diagnosis_license_no text not null,
  license_scope text,
  license_expires_on date,
  city text not null,
  district text not null,
  address text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_source text not null default 'manual' check (location_source in ('manual','verified_geocode')),
  phone text,
  business_hours text,
  supported_species text[] not null default '{}',
  specialties text[] not null default '{}',
  specialty_evidence text,
  services text[] not null default '{}',
  equipment text[] not null default '{}',
  emergency_service_level text not null default 'none'
    check (emergency_service_level in ('none','business_hours','24_hours')),
  emergency_hours text,
  price_note text,
  introduction text,
  moderation_status text not null default 'self_submitted'
    check (moderation_status in ('self_submitted','verified','rejected','suspended')),
  moderation_note text,
  moderated_by uuid references auth.users(id),
  moderated_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.hospital_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  hospital_profile_id uuid not null references public.hospital_public_profiles(id) on delete cascade,
  title text not null,
  advertising_copy text not null,
  target_city text not null,
  target_district text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft','pending','approved','active','paused','rejected','ended')),
  legal_label text not null default '广告' check (legal_label = '广告'),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.hospital_ad_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.hospital_ad_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression','open','call','navigation','appointment_request')),
  anonymous_session_hash text,
  city text,
  district text,
  happened_at timestamptz not null default now()
);

-- Append-only duty status. A hospital's static emergency capability does not mean
-- it can receive a patient at this moment, so each shift publishes a short-lived state.
create table public.hospital_emergency_availability (
  id bigint generated always as identity primary key,
  hospital_profile_id uuid not null references public.hospital_public_profiles(id) on delete cascade,
  state text not null check (state in ('accepting','limited','unavailable')),
  on_duty_phone text,
  capabilities text[] not null default '{}',
  note text,
  source text not null default 'hospital_dashboard' check (source in ('hospital_dashboard','platform_operator')),
  valid_until timestamptz not null,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until > created_at),
  check (state = 'unavailable' or length(trim(coalesce(on_duty_phone,''))) > 0)
);

create index hospital_public_profiles_location_idx
  on public.hospital_public_profiles(city,district,moderation_status,is_published);
create index hospital_ad_campaigns_delivery_idx
  on public.hospital_ad_campaigns(status,target_city,target_district,starts_at,ends_at);
create index hospital_ad_events_campaign_time_idx
  on public.hospital_ad_events(campaign_id,happened_at desc);
create index hospital_emergency_availability_current_idx
  on public.hospital_emergency_availability(hospital_profile_id,valid_until desc,created_at desc);

alter table public.hospital_public_profiles enable row level security;
alter table public.hospital_ad_campaigns enable row level security;
alter table public.hospital_ad_events enable row level security;
alter table public.hospital_emergency_availability enable row level security;

-- Owners may only discover a profile after platform verification and publication.
create policy "public reads verified hospital profiles" on public.hospital_public_profiles
  for select using(moderation_status='verified' and is_published=true);
create policy "hospital manages its public profile" on public.hospital_public_profiles
  for all using(public.is_hospital_member(hospital_id))
  with check(public.is_hospital_member(hospital_id) and moderation_status='self_submitted' and is_published=false);
create policy "platform reviews hospital public profiles" on public.hospital_public_profiles
  for all using(public.is_platform_admin()) with check(public.is_platform_admin());

-- Paid campaigns are a separate surface and can never modify organic match scores.
create policy "public reads active hospital ads" on public.hospital_ad_campaigns
  for select using(
    status='active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and exists(
      select 1 from public.hospital_public_profiles p
      where p.id=hospital_profile_id and p.moderation_status='verified' and p.is_published=true
    )
  );
create policy "hospital manages its ad drafts" on public.hospital_ad_campaigns
  for all using(
    exists(select 1 from public.hospital_public_profiles p where p.id=hospital_profile_id and public.is_hospital_member(p.hospital_id))
  ) with check(
    status in ('draft','pending','paused')
    and exists(select 1 from public.hospital_public_profiles p where p.id=hospital_profile_id and public.is_hospital_member(p.hospital_id))
  );
create policy "platform reviews hospital ads" on public.hospital_ad_campaigns
  for all using(public.is_platform_admin()) with check(public.is_platform_admin());

-- Owners only read unexpired status for an already verified and published hospital.
create policy "public reads current verified emergency status" on public.hospital_emergency_availability
  for select using(
    valid_until > now()
    and exists(
      select 1 from public.hospital_public_profiles p
      where p.id=hospital_profile_id and p.moderation_status='verified' and p.is_published=true
    )
  );
create policy "hospital publishes own emergency status" on public.hospital_emergency_availability
  for insert with check(
    exists(
      select 1 from public.hospital_public_profiles p
      where p.id=hospital_profile_id
        and p.moderation_status='verified'
        and p.is_published=true
        and p.emergency_service_level <> 'none'
        and public.is_hospital_member(p.hospital_id)
    )
  );
create policy "platform audits emergency status" on public.hospital_emergency_availability
  for select using(public.is_platform_admin());

-- No client insert/read policy is provided for ad events. Production writes go through
-- a rate-limited server endpoint using the service role, which prevents forged metrics.

comment on table public.hospital_public_profiles is
  'Public, platform-verified and deliberately de-identified hospital discovery profile.';
comment on table public.hospital_ad_campaigns is
  'Clearly labelled paid advertising; campaign state must never influence organic clinical matching.';
comment on table public.hospital_ad_events is
  'Server-recorded delivery events. Raw events are not readable or writable by browser clients.';
comment on table public.hospital_emergency_availability is
  'Append-only, short-lived duty status; never treat static 24-hour capability as guaranteed acceptance.';
