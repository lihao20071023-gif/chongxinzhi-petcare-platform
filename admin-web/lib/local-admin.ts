'use client';

import type { DashboardData, Hospital, HospitalApplication, KnowledgeEntry, Session, SystemSetting } from './types';

const ACCOUNT_KEY = 'chongxinzhi_local_admin_account_v1';
const WORKSPACE_KEY = 'chongxinzhi_local_admin_workspace_v1';
const LOCAL_TOKEN = 'local-admin-session';

type LocalAccount = {
  id: string;
  displayName: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

export type LocalWorkspace = {
  knowledge: KnowledgeEntry[];
  hospitals: Hospital[];
  applications: HospitalApplication[];
  settings: SystemSetting[];
};

const defaultSettings: SystemSetting[] = [
  {
    key: 'ai_safety_rules',
    value: {
      noDiagnosis: true,
      noMedicationChange: true,
      urgentEscalation: true,
      requireKnowledgeSources: true,
      message: 'AI不独立诊断、不新增或调整药物；异常情况必须建议联系兽医或及时就医。'
    },
    description: '平台强制安全底线，不允许在管理后台关闭',
    updated_at: new Date(0).toISOString()
  },
  {
    key: 'reminder_rules',
    value: {
      missedTaskHours: 2,
      consecutiveMissedTasks: 2,
      weightChangePercent: 5,
      waterChangePercent: 50,
      vomitingUrgentCount: 3,
      doctorReviewUrgent: true
    },
    description: '院后护理打卡、趋势和医生复核时限',
    updated_at: new Date(0).toISOString()
  }
];

function toBase64(bytes: Uint8Array) {
  let value = '';
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return window.btoa(value);
}

function fromBase64(value: string) {
  return Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array) {
  const material = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBuffer = new Uint8Array(salt).buffer;
  const bits = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations: 210_000 }, material, 256);
  return toBase64(new Uint8Array(bits));
}

function readAccount(): LocalAccount | null {
  try { return JSON.parse(window.localStorage.getItem(ACCOUNT_KEY) || 'null') as LocalAccount | null; } catch { return null; }
}

export function hasLocalAdmin() {
  return typeof window !== 'undefined' && Boolean(readAccount());
}

export async function createLocalAdmin(value: { displayName: string; email: string; password: string }) {
  if (readAccount()) throw new Error('这台电脑已经建立本机管理员，请直接登录。');
  const email = value.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('管理员邮箱格式不正确');
  if (value.password.length < 12 || !/[A-Za-z]/.test(value.password) || !/\d/.test(value.password)) throw new Error('密码至少12位，并同时包含字母和数字');
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const account: LocalAccount = {
    id: window.crypto.randomUUID(),
    displayName: value.displayName.trim() || '宠馨智管理员',
    email,
    salt: toBase64(salt),
    passwordHash: await derivePassword(value.password, salt),
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  if (!window.localStorage.getItem(WORKSPACE_KEY)) saveLocalWorkspace({ knowledge: [], hospitals: [], applications: [], settings: defaultSettings });
  return localSession(account);
}

export async function loginLocalAdmin(email: string, password: string) {
  const account = readAccount();
  if (!account || account.email !== email.trim().toLowerCase()) throw new Error('邮箱或密码错误');
  const actual = await derivePassword(password, fromBase64(account.salt));
  if (actual !== account.passwordHash) throw new Error('邮箱或密码错误');
  return localSession(account);
}

function localSession(account: LocalAccount): Session {
  return {
    accessToken: LOCAL_TOKEN,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    user: { id: account.id, email: account.email, displayName: account.displayName, role: 'admin' }
  };
}

export function isLocalSession(session: Session | null) {
  return session?.accessToken === LOCAL_TOKEN;
}

export function loadLocalWorkspace(): LocalWorkspace {
  try {
    const saved = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) || '{}') as Partial<LocalWorkspace>;
    return {
      knowledge: saved.knowledge || [],
      hospitals: saved.hospitals || [],
      applications: saved.applications || [],
      settings: saved.settings?.length ? saved.settings : defaultSettings
    };
  } catch { return { knowledge: [], hospitals: [], applications: [], settings: defaultSettings }; }
}

export function saveLocalWorkspace(value: LocalWorkspace) {
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(value));
}

function readList(key: string) {
  try { const value = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}

export function localDashboard(): DashboardData {
  const profiles = readList('petcare-pet-profiles-v3');
  const cases = profiles.filter((item) => item?.disease && item.disease !== '未填写').length;
  const completions = readList('petcare-care-task-completions-v1');
  const today = new Date().toISOString().slice(0, 10);
  const todayCompletions = completions.filter((item) => item?.date === today);
  const completed = todayCompletions.filter((item) => item?.status === 'completed').length;
  return {
    metrics: { users: profiles.length ? 1 : 0, dailyActiveUsers: profiles.length ? 1 : 0, cases, checkinCompletionRate: todayCompletions.length ? Math.round(completed / todayCompletions.length * 100) : 0 },
    metricDefinitions: {
      dailyActiveUsers: '本机开发模式只统计当前浏览器，不代表线上日活',
      checkinCompletionRate: '当前浏览器今日护理任务完成记录的比例'
    },
    activitySeries: [],
    pending: { hospitals: loadLocalWorkspace().applications.filter((item) => item.status === 'pending').length, knowledge: loadLocalWorkspace().knowledge.filter((item) => ['draft', 'in_review'].includes(item.review_status)).length }
  };
}

export function collectLocalBusinessData() {
  if (typeof window === 'undefined') return { mode: 'local' as const, owners: 0, petCount: 0, checkins: 0, symptomLogs: 0, reports: 0, carePlans: 0, completions: 0, alerts: 0, outcomes: 0, audits: 0, pets: [] };
  const profiles = readList('petcare-pet-profiles-v3');
  const prefixCount = (prefix: string) => {
    let total = 0;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) total += readList(key).length;
    }
    return total;
  };
  return {
    mode: 'local' as const,
    owners: profiles.length ? 1 : 0,
    petCount: profiles.length,
    checkins: prefixCount('petcare-daily-checkins:'),
    symptomLogs: prefixCount('petcare-symptom-logs:'),
    reports: prefixCount('petcare-medical-reports:'),
    carePlans: readList('petcare-signed-care-plans-v1').length,
    completions: readList('petcare-care-task-completions-v1').length,
    alerts: readList('petcare-care-alerts-v1').length,
    outcomes: readList('petcare-followup-outcomes-v1').length,
    audits: readList('petcare-care-audit-v1').length,
    pets: profiles.map((item) => ({ id: String(item.id || ''), name: String(item.name || '未命名'), species: item.species === 'dog' ? '犬' : '猫', disease: String(item.disease || '未填写'), stage: String(item.stage || '未填写'), authorization: String(item.careAuthorization || 'not_connected') }))
  };
}
