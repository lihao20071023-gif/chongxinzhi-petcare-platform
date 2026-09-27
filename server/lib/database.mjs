import { createClient } from '@supabase/supabase-js';
import { bearerToken, verifyAccessToken } from './security.mjs';

let adminClient;
let publicClient;

export function configuration() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || ''
  };
}

export function databaseConfigured() {
  const value = configuration();
  return Boolean(value.supabaseUrl && value.anonKey && value.serviceRoleKey && value.jwtSecret);
}

export function admin() {
  if (adminClient) return adminClient;
  const value = configuration();
  if (!databaseConfigured()) throw new Error('PostgreSQL/Supabase环境变量尚未配置');
  adminClient = createClient(value.supabaseUrl, value.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

export function publicAuth() {
  if (publicClient) return publicClient;
  const value = configuration();
  if (!value.supabaseUrl || !value.anonKey) throw new Error('SUPABASE_URL或SUPABASE_ANON_KEY未配置');
  publicClient = createClient(value.supabaseUrl, value.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return publicClient;
}

export function asUser(token) {
  const value = configuration();
  if (!value.supabaseUrl || !value.anonKey) throw new Error('SUPABASE_URL或SUPABASE_ANON_KEY未配置');
  return createClient(value.supabaseUrl, value.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function publicRole(databaseRole) {
  if (databaseRole === 'doctor') return 'doctor';
  if (databaseRole === 'platform_admin') return 'admin';
  return 'pet_owner';
}

export async function authenticate(request) {
  const token = bearerToken(request);
  if (!token) return null;
  const dbAdmin = admin();
  let userId = null;
  const supabaseUser = await dbAdmin.auth.getUser(token);
  if (supabaseUser.data.user) userId = supabaseUser.data.user.id;
  if (!userId) userId = verifyAccessToken(token, configuration().jwtSecret)?.sub || null;
  if (!userId) return null;
  const { data: profile, error } = await dbAdmin.from('user_profiles').select('platform_role,display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return { userId, token, role: publicRole(profile?.platform_role), displayName: profile?.display_name || '' };
}

export async function ownerContext(identity) {
  if (identity.role !== 'pet_owner') throw Object.assign(new Error('该接口仅限宠主'), { status: 403, code: 'PET_OWNER_REQUIRED' });
  const db = asUser(identity.token);
  let { data: owner, error } = await db.from('pet_owners').select('id,name').eq('user_id', identity.userId).maybeSingle();
  if (error) throw error;
  if (!owner) {
    const created = await db.from('pet_owners').insert({ user_id: identity.userId, name: identity.displayName || '微信用户' }).select('id,name').single();
    if (created.error) throw created.error;
    owner = created.data;
  }
  return { db, owner };
}

export async function doctorContext(identity) {
  if (identity.role !== 'doctor') throw Object.assign(new Error('该接口仅限医生'), { status: 403, code: 'DOCTOR_REQUIRED' });
  const db = asUser(identity.token);
  const membership = await db.from('hospital_members')
    .select('hospital_id,role,hospitals(id,name,status)')
    .eq('user_id', identity.userId).eq('active', true).in('role', ['doctor','hospital_admin']).limit(1).maybeSingle();
  if (membership.error) throw membership.error;
  if (!membership.data) throw Object.assign(new Error('医生尚未通过医院绑定审核'), { status: 403, code: 'HOSPITAL_BINDING_REQUIRED' });
  return { db, membership: membership.data, hospitalId: membership.data.hospital_id };
}

export function requireAdmin(identity) {
  if (identity.role !== 'admin') throw Object.assign(new Error('该接口仅限管理员'), { status: 403, code: 'ADMIN_REQUIRED' });
}

export async function recordDailyActivity(identity) {
  if (!identity?.userId) return;
  const activityDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const db = admin();
  const existing = await db.from('daily_user_activity')
    .select('request_count')
    .eq('user_id', identity.userId)
    .eq('activity_date', activityDate)
    .maybeSingle();
  if (existing.error) {
    if (existing.error.code === '42P01') return;
    throw existing.error;
  }
  const payload = {
    user_id: identity.userId,
    activity_date: activityDate,
    app_role: identity.role,
    request_count: (existing.data?.request_count || 0) + 1,
    last_seen_at: new Date().toISOString()
  };
  const result = await db.from('daily_user_activity').upsert(payload, { onConflict: 'user_id,activity_date' });
  if (result.error && result.error.code !== '42P01') throw result.error;
}
