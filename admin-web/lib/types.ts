export type SessionUser = { id: string; email: string; displayName: string; role: 'admin' };
export type Session = { accessToken: string; expiresAt: number; user: SessionUser };

export type DashboardData = {
  metrics: { users: number; dailyActiveUsers: number; cases: number; checkinCompletionRate: number };
  metricDefinitions: { dailyActiveUsers: string; checkinCompletionRate: string };
  activitySeries: Array<{ date: string; value: number }>;
  pending: { hospitals: number; knowledge: number };
};

export type KnowledgeEntry = {
  id: string;
  slug: string;
  title: string;
  species: 'cat' | 'dog' | 'both';
  disease: string;
  stage: string | null;
  scenario: string;
  trigger_terms: string[];
  core_conclusion: string;
  applicability: string;
  owner_explanation: string;
  next_action: string;
  forbidden_inference: string;
  source_title: string;
  source_organization: string | null;
  source_year: number | null;
  source_url: string | null;
  review_status: 'draft' | 'in_review' | 'approved' | 'retired';
  review_due_on: string | null;
  version: number;
  updated_at: string;
};

export type HospitalApplication = {
  id: string;
  legal_name: string;
  organization_name: string;
  phone: string;
  license_no: string;
  credential_paths: string[];
  status: string;
  created_at: string;
  requested_hospital?: { name?: string; address?: string } | null;
};

export type Hospital = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  status: string;
  doctorCount: number;
  caseCount: number;
  profile: null | {
    display_name: string;
    city: string;
    district: string;
    specialties: string[];
    moderation_status: string;
    is_published: boolean;
    animal_diagnosis_license_no: string;
  };
};

export type SystemSetting = { key: 'ai_safety_rules' | 'reminder_rules'; value: Record<string, unknown>; description: string; updated_at: string };
