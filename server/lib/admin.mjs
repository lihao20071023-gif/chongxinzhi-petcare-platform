import { admin, asUser, publicAuth, requireAdmin } from './database.mjs';
import { isoDate, readJson, required, routeMatch } from './http.mjs';
import { secretsEqual } from './security.mjs';

const ok = (body, status = 200) => ({ status, body });

export function enforceMandatoryAiSafetyRules(rules = {}) {
  return {
    ...rules,
    noDiagnosis: true,
    noMedicationChange: true,
    urgentEscalation: true,
    requireKnowledgeSources: true
  };
}

function safeDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(value);
}

function todayRange() {
  const today = safeDate(new Date());
  return { today, start: `${today}T00:00:00+08:00`, end: `${today}T23:59:59.999+08:00` };
}

function knowledgePayload(body, identity, existing = null) {
  const reviewStatus = ['draft', 'in_review', 'approved', 'retired'].includes(body.reviewStatus)
    ? body.reviewStatus
    : (existing?.review_status || 'draft');
  return {
    slug: required(body.slug || existing?.slug, '知识编号'),
    title: required(body.title || existing?.title, '标题'),
    species: ['cat', 'dog', 'both'].includes(body.species) ? body.species : (existing?.species || 'both'),
    disease: required(body.disease || existing?.disease, '疾病'),
    stage: body.stage ?? existing?.stage ?? null,
    scenario: required(body.scenario || existing?.scenario, '使用场景'),
    trigger_terms: Array.isArray(body.triggerTerms) ? body.triggerTerms.map(String).filter(Boolean).slice(0, 30) : (existing?.trigger_terms || []),
    core_conclusion: required(body.coreConclusion || existing?.core_conclusion, '核心结论'),
    applicability: required(body.applicability || existing?.applicability, '适用条件'),
    owner_explanation: required(body.ownerExplanation || existing?.owner_explanation, '宠主解释'),
    next_action: required(body.nextAction || existing?.next_action, '下一步行动'),
    forbidden_inference: required(body.forbiddenInference || existing?.forbidden_inference, '禁止推断'),
    source_title: required(body.sourceTitle || existing?.source_title, '来源标题'),
    source_organization: body.sourceOrganization ?? existing?.source_organization ?? null,
    source_year: body.sourceYear ? Number(body.sourceYear) : (existing?.source_year || null),
    source_url: body.sourceUrl ?? existing?.source_url ?? null,
    review_status: reviewStatus,
    reviewed_by: reviewStatus === 'approved' ? identity.userId : null,
    reviewed_at: reviewStatus === 'approved' ? new Date().toISOString() : null,
    review_due_on: body.reviewDueOn ?? existing?.review_due_on ?? null,
    version: existing ? Number(existing.version || 1) + 1 : 1,
    updated_at: new Date().toISOString()
  };
}

async function writeAudit(identity, action, resourceType, resourceId, metadata = {}) {
  const result = await admin().from('audit_logs').insert({
    actor_id: identity.userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ? String(resourceId) : null,
    metadata
  });
  if (result.error) throw result.error;
}

export async function adminPasswordLogin(request) {
  const body = await readJson(request);
  const email = required(body.email, '管理员邮箱').toLowerCase();
  const password = required(body.password, '密码');
  const signedIn = await publicAuth().auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session?.access_token || !signedIn.data.user) {
    throw Object.assign(new Error('邮箱或密码错误'), { status: 401, code: 'ADMIN_LOGIN_FAILED' });
  }
  const profile = await admin().from('user_profiles')
    .select('display_name,platform_role')
    .eq('id', signedIn.data.user.id)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.platform_role !== 'platform_admin') {
    await publicAuth().auth.signOut();
    throw Object.assign(new Error('该账号不是平台管理员'), { status: 403, code: 'ADMIN_REQUIRED' });
  }
  return ok({
    accessToken: signedIn.data.session.access_token,
    expiresAt: (signedIn.data.session.expires_at || 0) * 1000,
    user: { id: signedIn.data.user.id, email, displayName: profile.data.display_name || '管理员', role: 'admin' }
  });
}

async function platformAdminCount() {
  const result = await admin().from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('platform_role', 'platform_admin');
  if (result.error) throw result.error;
  return result.count || 0;
}

export async function adminSetupStatus() {
  const databaseConfigured = Boolean(
    process.env.SUPABASE_URL
    && process.env.SUPABASE_ANON_KEY
    && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.SUPABASE_JWT_SECRET
  );
  const setupTokenConfigured = String(process.env.ADMIN_SETUP_TOKEN || '').length >= 24;
  if (!databaseConfigured) {
    return ok({
      databaseConfigured: false,
      hasAdmin: false,
      setupAllowed: false,
      setupTokenConfigured
    });
  }
  const hasAdmin = (await platformAdminCount()) > 0;
  return ok({
    databaseConfigured: true,
    hasAdmin,
    setupAllowed: !hasAdmin && setupTokenConfigured,
    setupTokenConfigured
  });
}

export async function adminSetup(request) {
  const expectedToken = String(process.env.ADMIN_SETUP_TOKEN || '');
  if (expectedToken.length < 24) {
    throw Object.assign(new Error('服务器尚未配置一次性管理员初始化口令'), { status: 503, code: 'ADMIN_SETUP_NOT_CONFIGURED' });
  }
  if ((await platformAdminCount()) > 0) {
    throw Object.assign(new Error('管理员已建立，首次开通入口已经关闭'), { status: 409, code: 'ADMIN_ALREADY_EXISTS' });
  }

  const body = await readJson(request);
  const setupToken = required(body.setupToken, '一次性初始化口令');
  if (!secretsEqual(setupToken, expectedToken)) {
    throw Object.assign(new Error('一次性初始化口令不正确'), { status: 401, code: 'ADMIN_SETUP_TOKEN_INVALID' });
  }
  const email = required(body.email, '管理员邮箱').trim().toLowerCase();
  const password = required(body.password, '管理员密码');
  const displayName = String(body.displayName || '宠馨智管理员').trim().slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('管理员邮箱格式不正确'), { status: 422, code: 'VALIDATION_ERROR' });
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw Object.assign(new Error('密码至少12位，并同时包含字母和数字'), { status: 422, code: 'VALIDATION_ERROR' });
  }

  const db = admin();
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { registration_source: 'admin_first_setup' }
  });
  if (created.error || !created.data.user) {
    const duplicate = /already|registered|exists/i.test(created.error?.message || '');
    throw Object.assign(new Error(duplicate ? '该邮箱已被使用，请更换管理员邮箱' : '创建管理员账号失败'), {
      status: duplicate ? 409 : 500,
      code: duplicate ? 'ADMIN_EMAIL_EXISTS' : 'ADMIN_SETUP_FAILED'
    });
  }

  const profile = await db.from('user_profiles').upsert({
    id: created.data.user.id,
    display_name: displayName || '宠馨智管理员',
    platform_role: 'platform_admin'
  }).select('id').single();
  if (profile.error) {
    await db.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
    throw profile.error;
  }
  await db.from('audit_logs').insert({
    actor_id: created.data.user.id,
    action: 'platform_admin.bootstrap',
    resource_type: 'user_profile',
    resource_id: created.data.user.id,
    metadata: { email }
  });
  return ok({ created: true, email }, 201);
}

async function dashboard() {
  const db = admin();
  const { today, start, end } = todayRange();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const fromDate = safeDate(fourteenDaysAgo);
  const [users, activity, cases, activeTasks, completions, applications, knowledge, activitySeries] = await Promise.all([
    db.from('user_profiles').select('id', { count: 'exact', head: true }),
    db.from('daily_user_activity').select('user_id', { count: 'exact', head: true }).eq('activity_date', today),
    db.from('medical_cases').select('id', { count: 'exact', head: true }),
    db.from('care_tasks').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('starts_on', today).or(`ends_on.is.null,ends_on.gte.${today}`),
    db.from('care_task_completions').select('id,status').gte('scheduled_for', start).lte('scheduled_for', end),
    db.from('role_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('knowledge_entries').select('id', { count: 'exact', head: true }).in('review_status', ['draft', 'in_review']),
    db.from('daily_user_activity').select('activity_date,user_id').gte('activity_date', fromDate).lte('activity_date', today)
  ]);
  for (const result of [users, activity, cases, activeTasks, completions, applications, knowledge, activitySeries]) {
    if (result.error) throw result.error;
  }
  const seriesMap = new Map();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    seriesMap.set(safeDate(date), new Set());
  }
  for (const row of activitySeries.data || []) seriesMap.get(row.activity_date)?.add(row.user_id);
  const completedToday = (completions.data || []).filter((item) => item.status === 'completed').length;
  const scheduledToday = Math.max(activeTasks.count || 0, completions.data?.length || 0);
  return {
    metrics: {
      users: users.count || 0,
      dailyActiveUsers: activity.count || 0,
      cases: cases.count || 0,
      checkinCompletionRate: scheduledToday ? Math.round((completedToday / scheduledToday) * 1000) / 10 : 0
    },
    metricDefinitions: {
      dailyActiveUsers: '当日产生认证API访问的去重用户数',
      checkinCompletionRate: '今日已完成护理任务数 ÷ 今日应执行护理任务数'
    },
    activitySeries: [...seriesMap.entries()].map(([date, ids]) => ({ date, value: ids.size })),
    pending: { hospitals: applications.count || 0, knowledge: knowledge.count || 0 }
  };
}

async function knowledgeList(url) {
  const db = admin();
  let query = db.from('knowledge_entries').select('*').order('updated_at', { ascending: false }).limit(300);
  const status = url.searchParams.get('status');
  const species = url.searchParams.get('species');
  if (status) query = query.eq('review_status', status);
  if (species) query = query.eq('species', species);
  const result = await query;
  if (result.error) throw result.error;
  const keyword = (url.searchParams.get('q') || '').trim().toLowerCase();
  const items = keyword
    ? (result.data || []).filter((item) => JSON.stringify(item).toLowerCase().includes(keyword))
    : (result.data || []);
  return ok({ items });
}

async function hospitalList() {
  const db = admin();
  const [hospitals, profiles, applications, members, cases] = await Promise.all([
    db.from('hospitals').select('*').order('created_at', { ascending: false }),
    db.from('hospital_public_profiles').select('*'),
    db.from('role_applications').select('*').order('created_at', { ascending: false }).limit(300),
    db.from('hospital_members').select('hospital_id,user_id,role,active'),
    db.from('medical_cases').select('hospital_id,id')
  ]);
  for (const result of [hospitals, profiles, applications, members, cases]) if (result.error) throw result.error;
  const profileMap = new Map((profiles.data || []).map((item) => [item.hospital_id, item]));
  const countBy = (rows, key) => rows.reduce((map, item) => map.set(item[key], (map.get(item[key]) || 0) + 1), new Map());
  const doctorCounts = countBy((members.data || []).filter((item) => item.active && ['doctor', 'hospital_admin'].includes(item.role)), 'hospital_id');
  const caseCounts = countBy(cases.data || [], 'hospital_id');
  return ok({
    items: (hospitals.data || []).map((item) => ({ ...item, profile: profileMap.get(item.id) || null, doctorCount: doctorCounts.get(item.id) || 0, caseCount: caseCounts.get(item.id) || 0 })),
    applications: applications.data || []
  });
}

async function settingsList() {
  const result = await admin().from('system_settings').select('*').in('key', ['ai_safety_rules', 'reminder_rules']).order('key');
  if (result.error) throw result.error;
  return ok({ items: result.data || [] });
}

export async function handleAdminRoute({ request, url, path, identity }) {
  if (!path.startsWith('/admin/')) return null;
  requireAdmin(identity);
  const method = request.method;

  if (path === '/admin/dashboard' && method === 'GET') return ok(await dashboard());
  if (path === '/admin/knowledge' && method === 'GET') return knowledgeList(url);
  if (path === '/admin/knowledge' && method === 'POST') {
    const body = await readJson(request);
    const result = await admin().from('knowledge_entries').insert(knowledgePayload(body, identity)).select('*').single();
    if (result.error) throw result.error;
    await writeAudit(identity, 'knowledge.create', 'knowledge_entry', result.data.id, { reviewStatus: result.data.review_status });
    return ok({ item: result.data }, 201);
  }
  const knowledgeParams = routeMatch(path, '/admin/knowledge/:knowledgeId');
  if (knowledgeParams) {
    const existing = await admin().from('knowledge_entries').select('*').eq('id', knowledgeParams.knowledgeId).single();
    if (existing.error) throw Object.assign(new Error('知识条目不存在'), { status: 404, code: 'KNOWLEDGE_NOT_FOUND' });
    if (method === 'GET') return ok({ item: existing.data });
    if (method === 'PATCH') {
      const body = await readJson(request);
      const result = await admin().from('knowledge_entries').update(knowledgePayload(body, identity, existing.data)).eq('id', knowledgeParams.knowledgeId).select('*').single();
      if (result.error) throw result.error;
      await writeAudit(identity, 'knowledge.update', 'knowledge_entry', result.data.id, { reviewStatus: result.data.review_status, version: result.data.version });
      return ok({ item: result.data });
    }
    if (method === 'DELETE') {
      const result = await admin().from('knowledge_entries').delete().eq('id', knowledgeParams.knowledgeId);
      if (result.error) throw result.error;
      await writeAudit(identity, 'knowledge.delete', 'knowledge_entry', knowledgeParams.knowledgeId);
      return ok({ deleted: true });
    }
  }

  if (path === '/admin/hospitals' && method === 'GET') return hospitalList();
  const applicationParams = routeMatch(path, '/admin/hospital-applications/:applicationId/review');
  if (applicationParams && method === 'POST') {
    const body = await readJson(request);
    const approve = body.approve === true;
    const result = await asUser(identity.token).rpc('review_doctor_application', {
      application_id: applicationParams.applicationId,
      approve,
      note: body.note || null
    });
    if (result.error) throw result.error;
    await writeAudit(identity, approve ? 'hospital_application.approve' : 'hospital_application.reject', 'role_application', applicationParams.applicationId, { note: body.note || null, hospitalId: result.data || null });
    return ok({ approved: approve, hospitalId: result.data || null });
  }
  const hospitalParams = routeMatch(path, '/admin/hospitals/:hospitalId');
  if (hospitalParams && method === 'PATCH') {
    const body = await readJson(request);
    const allowedHospitalStatus = new Set(['active', 'pending_review', 'suspended', 'rejected']);
    const allowedModerationStatus = new Set(['self_submitted', 'verified', 'rejected', 'suspended']);
    if (body.status && !allowedHospitalStatus.has(body.status)) throw Object.assign(new Error('医院状态无效'), { status: 422, code: 'VALIDATION_ERROR' });
    if (body.moderationStatus && !allowedModerationStatus.has(body.moderationStatus)) throw Object.assign(new Error('公开资料审核状态无效'), { status: 422, code: 'VALIDATION_ERROR' });
    if (body.status) {
      const hospital = await admin().from('hospitals').update({ status: body.status }).eq('id', hospitalParams.hospitalId).select('*').single();
      if (hospital.error) throw hospital.error;
    }
    if (body.moderationStatus) {
      const profile = await admin().from('hospital_public_profiles').update({
        moderation_status: body.moderationStatus,
        moderation_note: body.note || null,
        moderated_by: identity.userId,
        moderated_at: new Date().toISOString(),
        is_published: body.moderationStatus === 'verified' && body.isPublished === true,
        updated_at: new Date().toISOString()
      }).eq('hospital_id', hospitalParams.hospitalId);
      if (profile.error) throw profile.error;
    }
    await writeAudit(identity, 'hospital.update_status', 'hospital', hospitalParams.hospitalId, { status: body.status, moderationStatus: body.moderationStatus, note: body.note || null });
    return ok({ updated: true });
  }

  if (path === '/admin/settings' && method === 'GET') return settingsList();
  if (path === '/admin/settings' && method === 'PATCH') {
    const body = await readJson(request);
    const updates = [];
    if (body.aiSafetyRules && typeof body.aiSafetyRules === 'object') {
      // These are product safety invariants rather than administrator preferences.
      // Force them on at the API boundary so a stale client or direct request cannot
      // disable the medical safety rules stored in the database.
      const mandatorySafetyRules = enforceMandatoryAiSafetyRules(body.aiSafetyRules);
      updates.push({ key: 'ai_safety_rules', value: mandatorySafetyRules, description: '平台强制安全底线：AI不诊断、不改药，危险信号升级就医，医疗回答引用已审核知识', updated_by: identity.userId, updated_at: new Date().toISOString() });
    }
    if (body.reminderRules && typeof body.reminderRules === 'object') updates.push({ key: 'reminder_rules', value: body.reminderRules, description: '院后护理打卡异常和提醒阈值', updated_by: identity.userId, updated_at: new Date().toISOString() });
    if (!updates.length) throw Object.assign(new Error('没有可保存的配置'), { status: 422, code: 'VALIDATION_ERROR' });
    const result = await admin().from('system_settings').upsert(updates, { onConflict: 'key' }).select('*');
    if (result.error) throw result.error;
    await writeAudit(identity, 'system_settings.update', 'system_settings', null, { keys: updates.map((item) => item.key) });
    return ok({ items: result.data || [] });
  }

  return null;
}
