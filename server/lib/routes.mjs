import { randomUUID } from 'node:crypto';
import { admin, asUser, configuration, databaseConfigured, doctorContext, ownerContext, publicRole } from './database.mjs';
import { aiConfigured, analyzeHealthCheckin, answerWithKnowledge, generateCareTasks } from './ai.mjs';
import { adminPasswordLogin, adminSetup, adminSetupStatus, handleAdminRoute } from './admin.mjs';
import { isoDate, labelDate, optionalNumber, readJson, required, routeMatch } from './http.mjs';
import { randomSecret, sha256, signAccessToken } from './security.mjs';

const ok = (body, status = 200) => ({ status, body });
const notFound = () => { throw Object.assign(new Error('接口不存在'), { status: 404, code: 'NOT_FOUND' }); };

function sanitizeFileName(value) {
  return String(value || 'report.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

async function wechatLogin(request) {
  const appId = process.env.WECHAT_APP_ID || '';
  const appSecret = process.env.WECHAT_APP_SECRET || '';
  const pepper = process.env.WECHAT_OPENID_PEPPER || '';
  const jwtSecret = configuration().jwtSecret;
  if (!appId || !appSecret || !pepper || !jwtSecret) {
    throw Object.assign(new Error('微信登录尚未配置完整'), { status: 503, code: 'WECHAT_AUTH_NOT_CONFIGURED' });
  }
  const body = await readJson(request);
  const code = required(body.code, '微信登录code');
  const requestedRole = body.requestedRole === 'doctor' ? 'doctor' : 'pet_owner';
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appId);
  url.searchParams.set('secret', appSecret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');
  const exchange = await fetch(url, { signal: AbortSignal.timeout(Math.min(30000, Math.max(3000, Number(process.env.WECHAT_TIMEOUT_MS || 10000)))) });
  const wechat = await exchange.json();
  if (!exchange.ok || !wechat.openid) throw Object.assign(new Error('微信身份校验失败'), { status: 401, code: 'WECHAT_LOGIN_FAILED' });

  const openidHash = sha256(`${pepper}:${wechat.openid}`);
  const unionidHash = wechat.unionid ? sha256(`${pepper}:${wechat.unionid}`) : null;
  const dbAdmin = admin();
  const identityLookup = await dbAdmin.from('wechat_identities').select('user_id').eq('openid_hash', openidHash).maybeSingle();
  if (identityLookup.error) throw identityLookup.error;
  let userId = identityLookup.data?.user_id;
  if (!userId) {
    const created = await dbAdmin.auth.admin.createUser({
      email: `wx_${openidHash.slice(0, 40)}@wechat.invalid`,
      password: randomSecret(),
      email_confirm: true,
      user_metadata: { registration_source: 'wechat_miniprogram' }
    });
    if (created.error || !created.data.user) throw Object.assign(new Error('账号创建失败'), { status: 500, code: 'ACCOUNT_CREATE_FAILED' });
    userId = created.data.user.id;
    const profile = await dbAdmin.from('user_profiles').upsert({ id: userId, platform_role: requestedRole === 'doctor' ? 'doctor' : 'owner' });
    if (profile.error) throw profile.error;
    const identityInsert = await dbAdmin.from('wechat_identities').insert({ user_id: userId, openid_hash: openidHash, unionid_hash: unionidHash });
    if (identityInsert.error) throw identityInsert.error;
  } else {
    await dbAdmin.from('wechat_identities').update({ last_login_at: new Date().toISOString() }).eq('user_id', userId);
  }
  const profile = await dbAdmin.from('user_profiles').select('display_name,platform_role').eq('id', userId).single();
  if (profile.error) throw profile.error;
  const role = publicRole(profile.data.platform_role);
  let doctorStatus = null;
  if (role === 'doctor') {
    const member = await dbAdmin.from('hospital_members').select('hospital_id').eq('user_id', userId).eq('active', true).limit(1).maybeSingle();
    doctorStatus = member.data ? 'approved' : 'pending';
  }
  const signed = signAccessToken(userId, jwtSecret);
  return ok({ accessToken: signed.token, expiresAt: signed.expiresAt, user: { id: userId, displayName: profile.data.display_name || '', role, doctorStatus } });
}

async function verifiedHospitals() {
  const result = await admin().from('hospital_public_profiles')
    .select('hospital_id,display_name,city,district,address,specialties,services,emergency_service_level')
    .eq('moderation_status', 'verified').eq('is_published', true).order('display_name');
  if (result.error) throw result.error;
  return (result.data || []).map((item) => ({ id: item.hospital_id, name: item.display_name, ...item }));
}

async function petList(identity) {
  const { db, owner } = await ownerContext(identity);
  const pets = await db.from('pets').select('*').eq('owner_id', owner.id).order('created_at');
  if (pets.error) throw pets.error;
  const ids = (pets.data || []).map((pet) => pet.id);
  const consents = ids.length ? await db.from('pet_hospital_consents').select('pet_id,hospital_id').in('pet_id', ids).is('revoked_at', null) : { data: [], error: null };
  if (consents.error) throw consents.error;
  const hospitalIds = [...new Set((consents.data || []).map((item) => item.hospital_id))];
  const profiles = hospitalIds.length ? await admin().from('hospital_public_profiles').select('hospital_id,display_name').in('hospital_id', hospitalIds) : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map((profiles.data || []).map((item) => [item.hospital_id, item.display_name]));
  const byPet = new Map((consents.data || []).map((item) => [item.pet_id, { id: item.hospital_id, name: names.get(item.hospital_id) || '已授权医院' }]));
  return { db, owner, items: (pets.data || []).map((pet) => ({ ...pet, hospital: byPet.get(pet.id) || null, hospital_name: byPet.get(pet.id)?.name || null })) };
}

async function assertPet(identity, petId) {
  const db = asUser(identity.token);
  const result = await db.from('pets').select('*,pet_owners(id,user_id,name)').eq('id', petId).single();
  if (result.error) throw Object.assign(new Error('宠物不存在或无权访问'), { status: 404, code: 'PET_NOT_FOUND' });
  return { db, pet: result.data };
}

async function caseDetail(identity, caseId) {
  const db = asUser(identity.token);
  const caseResult = await db.from('medical_cases').select('*,pets(*),hospitals(id,name)').eq('id', caseId).single();
  if (caseResult.error) throw Object.assign(new Error('病例不存在或无权访问'), { status: 404, code: 'CASE_NOT_FOUND' });
  const [plans, checkins] = await Promise.all([
    db.from('care_plans').select('*').eq('case_id', caseId).order('version', { ascending: false }),
    db.from('health_checkins').select('*').eq('pet_id', caseResult.data.pet_id).order('recorded_at', { ascending: false }).limit(60)
  ]);
  if (plans.error) throw plans.error;
  if (checkins.error) throw checkins.error;
  const planIds = (plans.data || []).map((item) => item.id);
  const tasks = planIds.length ? await db.from('care_tasks').select('*').in('care_plan_id', planIds).order('created_at') : { data: [], error: null };
  if (tasks.error) throw tasks.error;
  const taskIds = (tasks.data || []).map((item) => item.id);
  const completions = taskIds.length ? await db.from('care_task_completions').select('*').in('task_id', taskIds).order('scheduled_for', { ascending: false }).limit(200) : { data: [], error: null };
  if (completions.error) throw completions.error;
  return { case: caseResult.data, plans: plans.data || [], tasks: tasks.data || [], checkins: checkins.data || [], completions: completions.data || [] };
}

async function insertCarePlan(identity, caseId, body, generated = false) {
  const { db, hospitalId } = await doctorContext(identity);
  const caseResult = await db.from('medical_cases').select('id,pet_id,hospital_id').eq('id', caseId).eq('hospital_id', hospitalId).single();
  if (caseResult.error) throw Object.assign(new Error('本院病例不存在'), { status: 404, code: 'CASE_NOT_FOUND' });
  const latest = await db.from('care_plans').select('version').eq('case_id', caseId).order('version', { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw latest.error;
  const plan = await db.from('care_plans').insert({
    case_id: caseId, hospital_id: hospitalId, pet_id: caseResult.data.pet_id, author_id: identity.userId,
    status: 'draft', version: (latest.data?.version || 0) + 1,
    plan: { title: required(body.title || '院后护理方案', '方案标题'), medicalOrder: required(body.medicalOrder, '医嘱'), summary: body.summary || '', generatedByAi: generated }
  }).select('*').single();
  if (plan.error) throw plan.error;
  const startDate = required(body.startDate, '开始日期');
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  if (tasks.length) {
    const inserted = await db.from('care_tasks').insert(tasks.map((task) => ({
      care_plan_id: plan.data.id, case_id: caseId, hospital_id: hospitalId, pet_id: caseResult.data.pet_id,
      created_by: identity.userId, title: required(task.title, '任务标题'), instruction: required(task.instruction, '任务说明'),
      task_type: task.taskType || task.task_type || 'other', schedule: task.schedule || {}, starts_on: startDate, ends_on: task.endsOn || null, status: 'draft'
    }))).select('*');
    if (inserted.error) throw inserted.error;
    return { plan: plan.data, tasks: inserted.data || [] };
  }
  return { plan: plan.data, tasks: [] };
}

async function analyzeAndStoreCheckin(pet, checkin) {
  const dbAdmin = admin();
  const previousResult = await dbAdmin.from('health_checkins').select('*')
    .eq('pet_id', pet.id).neq('id', checkin.id).order('recorded_at', { ascending: false }).limit(14);
  if (previousResult.error) throw previousResult.error;
  const analysis = await analyzeHealthCheckin({ pet, current: checkin, previous: previousResult.data || [] });
  if (!analysis.hasAlert) return analysis;
  const caseResult = await dbAdmin.from('medical_cases').select('id').eq('pet_id', pet.id)
    .in('status', ['active', 'follow_up']).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (caseResult.error) throw caseResult.error;
  const alert = await dbAdmin.from('health_alerts').upsert({
    pet_id: pet.id,
    case_id: caseResult.data?.id || null,
    checkin_id: checkin.id,
    severity: analysis.severity,
    title: analysis.title,
    explanation: analysis.explanation,
    owner_message: analysis.ownerMessage,
    recommended_action: analysis.recommendedAction,
    detection_source: analysis.detectionSource,
    evidence: { signals: analysis.signals }
  }, { onConflict: 'checkin_id' }).select('*').single();
  if (alert.error) throw alert.error;
  return { ...analysis, alert: alert.data };
}

export async function handleRoute({ request, url, path, identity }) {
  const method = request.method;
  if (path === '/health' && method === 'GET') return ok({ service: 'chongxinzhi-api', status: 'ok', databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), time: new Date().toISOString() });
  if (path === '/ready' && method === 'GET') {
    const checks = {
      database: false,
      wechat: Boolean(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET && process.env.WECHAT_OPENID_PEPPER),
      ai: aiConfigured(),
      storage: false
    };
    if (databaseConfigured()) {
      try {
        const databaseCheck = await admin().from('system_settings').select('key').limit(1);
        checks.database = !databaseCheck.error;
        if (checks.database && process.env.REPORTS_BUCKET) {
          const bucketCheck = await admin().storage.getBucket(process.env.REPORTS_BUCKET);
          checks.storage = !bucketCheck.error && bucketCheck.data?.public === false;
        }
      } catch {
        checks.database = false;
        checks.storage = false;
      }
    }
    const ready = Object.values(checks).every(Boolean);
    return ok({ service: 'chongxinzhi-api', status: ready ? 'ready' : 'not_ready', checks, time: new Date().toISOString() }, ready ? 200 : 503);
  }
  if (path === '/auth/wechat' && method === 'POST') return wechatLogin(request);
  if (path === '/auth/admin-setup-status' && method === 'GET') return adminSetupStatus();
  if (path === '/auth/admin-setup' && method === 'POST') return adminSetup(request);
  if (path === '/auth/admin-password' && method === 'POST') return adminPasswordLogin(request);
  if (!identity) throw Object.assign(new Error('请先登录'), { status: 401, code: 'UNAUTHORIZED' });

  if (path === '/me' && method === 'GET') {
    let doctorStatus = null;
    if (identity.role === 'doctor') {
      const member = await admin().from('hospital_members').select('hospital_id').eq('user_id', identity.userId).eq('active', true).limit(1).maybeSingle();
      doctorStatus = member.data ? 'approved' : 'pending';
    }
    return ok({ user: { id: identity.userId, displayName: identity.displayName, role: identity.role, doctorStatus } });
  }

  if ((path === '/hospitals' || path === '/owner/hospitals') && method === 'GET') return ok({ items: await verifiedHospitals() });

  if ((path === '/owner/hospital-bindings' || path === '/owner/hospitals') && method === 'POST') {
    const { db } = await ownerContext(identity);
    const body = await readJson(request);
    const binding = await db.from('pet_hospital_consents').upsert({ pet_id: required(body.petId, '宠物'), hospital_id: required(body.hospitalId, '医院'), granted_by: identity.userId, revoked_at: null }, { onConflict: 'pet_id,hospital_id' }).select('*').single();
    if (binding.error) throw binding.error;
    return ok({ binding: binding.data }, 201);
  }

  if (path === '/doctor/hospital-bindings' && identity.role === 'doctor') {
    const db = asUser(identity.token);
    if (method === 'GET') {
      const application = await db.from('role_applications').select('*').eq('applicant_id', identity.userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (application.error) throw application.error;
      return ok({ hospitals: await verifiedHospitals(), application: application.data ? { ...application.data, status_label: application.data.status, created_at_label: labelDate(application.data.created_at) } : null });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const existing = body.mode === 'existing';
      let organizationName = body.hospitalName;
      if (existing) {
        const hospital = await admin().from('hospitals').select('name').eq('id', required(body.hospitalId, '医院')).single();
        if (hospital.error) throw hospital.error;
        organizationName = hospital.data.name;
      }
      const result = await db.from('role_applications').insert({
        applicant_id: identity.userId, requested_role: 'doctor', legal_name: required(body.legalName, '医生姓名'), phone: required(body.phone, '联系电话'),
        organization_name: required(organizationName, '医院名称'), license_no: required(body.licenseNo, '执业兽医资格证号'),
        hospital_id: existing ? body.hospitalId : null, requested_hospital: existing ? null : { name: organizationName, address: required(body.address, '医院地址') }, status: 'pending'
      }).select('*').single();
      if (result.error) throw result.error;
      return ok({ application: result.data }, 201);
    }
  }

  if ((path === '/pets' || path === '/owner/pets') && method === 'GET') {
    const result = await petList(identity);
    return ok({ items: result.items });
  }
  if ((path === '/pets' || path === '/owner/pets') && method === 'POST') {
    const { db, owner } = await ownerContext(identity);
    const body = await readJson(request);
    const created = await db.from('pets').insert({ owner_id: owner.id, name: required(body.name, '宠物名字'), species: body.species === 'dog' ? 'dog' : 'cat', breed: body.breed?.trim() || null, sex: body.sex || null, birth_date: body.birthDate || null, weight_kg: optionalNumber(body.weightKg, '实际体重'), disease: body.disease || null, stage: body.stage || null }).select('*').single();
    if (created.error) throw created.error;
    return ok({ item: created.data }, 201);
  }

  const petParams = routeMatch(path, '/pets/:petId');
  if (petParams) {
    const { db, pet } = await assertPet(identity, petParams.petId);
    if (method === 'GET') return ok({ item: pet });
    if (identity.role !== 'pet_owner') throw Object.assign(new Error('宠物档案只能由宠主修改'), { status: 403, code: 'PET_OWNER_REQUIRED' });
    if (method === 'PATCH') {
      const body = await readJson(request);
      const allowed = { name: body.name, breed: body.breed, sex: body.sex, birth_date: body.birthDate, weight_kg: body.weightKg === undefined ? undefined : optionalNumber(body.weightKg, '实际体重'), disease: body.disease, stage: body.stage, updated_at: new Date().toISOString() };
      const updates = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
      const updated = await db.from('pets').update(updates).eq('id', pet.id).select('*').single();
      if (updated.error) throw updated.error;
      return ok({ item: updated.data });
    }
    if (method === 'DELETE') {
      const deleted = await db.from('pets').delete().eq('id', pet.id);
      if (deleted.error) throw deleted.error;
      return ok({ deleted: true });
    }
  }

  const petCheckins = routeMatch(path, '/pets/:petId/checkins');
  if (petCheckins) {
    const { db, pet } = await assertPet(identity, petCheckins.petId);
    if (method === 'GET') {
      const result = await db.from('health_checkins').select('*').eq('pet_id', pet.id).order('recorded_at', { ascending: false }).limit(200);
      if (result.error) throw result.error;
      return ok({ items: result.data || [] });
    }
    if (method === 'POST') {
      if (identity.role !== 'pet_owner') throw Object.assign(new Error('健康打卡只能由宠主提交'), { status: 403, code: 'PET_OWNER_REQUIRED' });
      const body = await readJson(request);
      const result = await db.from('health_checkins').insert({ pet_id: pet.id, recorded_by: identity.userId, weight_kg: optionalNumber(body.weightKg, '体重'), water_ml: optionalNumber(body.waterMl, '饮水量'), appetite: body.appetite || null, spirit: body.spirit || null, urine_note: body.urineNote || null, stool_note: body.stoolNote || null, vomiting_count: Math.max(0, Number(body.vomitingCount || 0)), symptom_note: body.symptomNote || null, photo_paths: Array.isArray(body.photoPaths) ? body.photoPaths : [] }).select('*').single();
      if (result.error) throw result.error;
      const analysis = await analyzeAndStoreCheckin(pet, result.data);
      return ok({ item: result.data, analysis }, 201);
    }
  }

  const petAlerts = routeMatch(path, '/pets/:petId/alerts');
  if (petAlerts && method === 'GET') {
    const { db, pet } = await assertPet(identity, petAlerts.petId);
    const result = await db.from('health_alerts').select('*').eq('pet_id', pet.id).order('created_at', { ascending: false }).limit(100);
    if (result.error) throw result.error;
    return ok({ items: result.data || [] });
  }

  const uploadTicket = routeMatch(path, '/pets/:petId/lab-reports/upload-ticket');
  if (uploadTicket && method === 'POST') {
    if (identity.role !== 'pet_owner') throw Object.assign(new Error('仅宠主可以上传化验单'), { status: 403, code: 'PET_OWNER_REQUIRED' });
    await assertPet(identity, uploadTicket.petId);
    const body = await readJson(request);
    const bucket = process.env.REPORTS_BUCKET || 'medical-reports';
    const objectPath = `${identity.userId}/${uploadTicket.petId}/${randomUUID()}-${sanitizeFileName(body.fileName)}`;
    const signed = await admin().storage.from(bucket).createSignedUploadUrl(objectPath);
    if (signed.error) throw Object.assign(new Error('报告存储尚未配置'), { status: 503, code: 'STORAGE_NOT_CONFIGURED', details: signed.error.message });
    return ok({ bucket, path: objectPath, signedUrl: signed.data.signedUrl, token: signed.data.token });
  }

  const reports = routeMatch(path, '/pets/:petId/lab-reports');
  if (reports) {
    const { db, pet } = await assertPet(identity, reports.petId);
    if (method === 'GET') {
      const result = await db.from('lab_reports').select('*,lab_results(*)').eq('pet_id', pet.id).order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return ok({ items: result.data || [] });
    }
    if (method === 'POST') {
      if (identity.role !== 'pet_owner') throw Object.assign(new Error('仅宠主可以登记上传报告'), { status: 403, code: 'PET_OWNER_REQUIRED' });
      const body = await readJson(request);
      const result = await db.from('lab_reports').insert({ pet_id: pet.id, report_type: required(body.reportType, '报告类型'), collected_at: body.collectedAt ? isoDate(body.collectedAt, '采样时间') : null, source: 'owner_upload', source_file_path: required(body.sourceFilePath, '文件路径'), uploaded_by: identity.userId, ocr_status: 'pending' }).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data }, 201);
    }
  }

  if (path === '/cases') {
    const db = asUser(identity.token);
    if (method === 'GET') {
      let query = db.from('medical_cases').select('*,pets(id,name,species,disease,stage),hospitals(id,name)').order('updated_at', { ascending: false });
      if (url.searchParams.get('status')) query = query.eq('status', url.searchParams.get('status'));
      const result = await query;
      if (result.error) throw result.error;
      return ok({ items: result.data || [] });
    }
    if (method === 'POST') {
      const { db: doctorDb, hospitalId } = await doctorContext(identity);
      const body = await readJson(request);
      const pet = await doctorDb.from('pets').select('id,owner_id').eq('id', required(body.petId, '宠物')).single();
      if (pet.error) throw Object.assign(new Error('宠物未授权给本院'), { status: 403, code: 'PET_NOT_AUTHORIZED' });
      const result = await doctorDb.from('medical_cases').insert({ hospital_id: hospitalId, owner_id: pet.data.owner_id, pet_id: pet.data.id, primary_doctor_id: identity.userId, title: required(body.title, '病例标题'), diagnosis: body.diagnosis || null, disease_stage: body.diseaseStage || null, status: body.status || 'active', admitted_at: body.admittedAt ? isoDate(body.admittedAt, '接诊时间') : new Date().toISOString(), discharged_at: body.dischargedAt ? isoDate(body.dischargedAt, '出院时间') : null, notes: body.notes || null }).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data }, 201);
    }
  }

  const caseParams = routeMatch(path, '/cases/:caseId');
  if (caseParams) {
    if (method === 'GET') return ok(await caseDetail(identity, caseParams.caseId));
    const { db, hospitalId } = await doctorContext(identity);
    if (method === 'PATCH') {
      const body = await readJson(request);
      const allowed = { title: body.title, diagnosis: body.diagnosis, disease_stage: body.diseaseStage, status: body.status, admitted_at: body.admittedAt ? isoDate(body.admittedAt, '接诊时间') : undefined, discharged_at: body.dischargedAt ? isoDate(body.dischargedAt, '出院时间') : body.dischargedAt, notes: body.notes, updated_at: new Date().toISOString() };
      const updates = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
      const result = await db.from('medical_cases').update(updates).eq('id', caseParams.caseId).eq('hospital_id', hospitalId).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data });
    }
    if (method === 'DELETE') {
      const result = await db.from('medical_cases').delete().eq('id', caseParams.caseId).eq('hospital_id', hospitalId).eq('status', 'draft');
      if (result.error) throw result.error;
      return ok({ deleted: true });
    }
  }

  const casePlans = routeMatch(path, '/cases/:caseId/care-plans');
  if (casePlans) {
    if (method === 'GET') {
      await caseDetail(identity, casePlans.caseId);
      const db = asUser(identity.token);
      const result = await db.from('care_plans').select('*,care_tasks(*)').eq('case_id', casePlans.caseId).order('version', { ascending: false });
      if (result.error) throw result.error;
      return ok({ items: result.data || [] });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      return ok(await insertCarePlan(identity, casePlans.caseId, body), 201);
    }
  }

  const generatePlans = routeMatch(path, '/cases/:caseId/care-plans/generate-tasks');
  if (generatePlans && method === 'POST') {
    await doctorContext(identity);
    const body = await readJson(request);
    const detail = await caseDetail(identity, generatePlans.caseId);
    const generated = await generateCareTasks({ pet: detail.case.pets, medicalOrder: required(body.medicalOrder, '医生医嘱'), startDate: required(body.startDate, '开始日期') });
    const saved = await insertCarePlan(identity, generatePlans.caseId, { title: body.title || 'AI拆解护理方案', medicalOrder: body.medicalOrder, startDate: body.startDate, summary: generated.summary, tasks: generated.tasks }, true);
    return ok({ ...saved, missingConfirmations: generated.missingConfirmations, requiresDoctorApproval: true }, 201);
  }

  const planParams = routeMatch(path, '/care-plans/:planId');
  if (planParams) {
    const { db, hospitalId } = await doctorContext(identity);
    if (method === 'PATCH') {
      const body = await readJson(request);
      const updates = { plan: body.plan, status: body.status, updated_at: new Date().toISOString() };
      const result = await db.from('care_plans').update(Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined))).eq('id', planParams.planId).eq('hospital_id', hospitalId).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data });
    }
    if (method === 'DELETE') {
      const result = await db.from('care_plans').delete().eq('id', planParams.planId).eq('hospital_id', hospitalId).eq('status', 'draft');
      if (result.error) throw result.error;
      return ok({ deleted: true });
    }
  }

  const publishPlan = routeMatch(path, '/care-plans/:planId/publish');
  if (publishPlan && method === 'POST') {
    const { db, hospitalId } = await doctorContext(identity);
    const publishedAt = new Date().toISOString();
    const plan = await db.from('care_plans').update({ status: 'published', reviewed_by: identity.userId, published_at: publishedAt }).eq('id', publishPlan.planId).eq('hospital_id', hospitalId).eq('status', 'draft').select('*').single();
    if (plan.error) throw plan.error;
    const tasks = await db.from('care_tasks').update({ status: 'active', updated_at: publishedAt }).eq('care_plan_id', plan.data.id).eq('hospital_id', hospitalId);
    if (tasks.error) throw tasks.error;
    return ok({ item: plan.data, status: 'published' });
  }

  if (path === '/tasks/today' && method === 'GET') {
    const { db, owner } = await ownerContext(identity);
    const pets = await db.from('pets').select('id,name').eq('owner_id', owner.id);
    if (pets.error) throw pets.error;
    const ids = (pets.data || []).map((pet) => pet.id);
    if (!ids.length) return ok({ items: [] });
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await db.from('care_tasks').select('*').in('pet_id', ids).eq('status', 'active').lte('starts_on', today).or(`ends_on.is.null,ends_on.gte.${today}`).order('created_at');
    if (tasks.error) throw tasks.error;
    const taskIds = (tasks.data || []).map((task) => task.id);
    const completions = taskIds.length ? await db.from('care_task_completions').select('*').in('task_id', taskIds).gte('scheduled_for', `${today}T00:00:00Z`).lt('scheduled_for', `${today}T23:59:59Z`) : { data: [], error: null };
    if (completions.error) throw completions.error;
    const completed = new Map((completions.data || []).map((item) => [item.task_id, item]));
    const petNames = new Map((pets.data || []).map((pet) => [pet.id, pet.name]));
    return ok({ items: (tasks.data || []).map((task) => ({ ...task, pet_name: petNames.get(task.pet_id), completion: completed.get(task.id) || null })) });
  }

  const taskParams = routeMatch(path, '/tasks/:taskId');
  if (taskParams) {
    const { db, hospitalId } = await doctorContext(identity);
    if (method === 'PATCH') {
      const body = await readJson(request);
      const allowed = { title: body.title, instruction: body.instruction, task_type: body.taskType, schedule: body.schedule, starts_on: body.startsOn, ends_on: body.endsOn, status: body.status, updated_at: new Date().toISOString() };
      const result = await db.from('care_tasks').update(Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined))).eq('id', taskParams.taskId).eq('hospital_id', hospitalId).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data });
    }
    if (method === 'DELETE') {
      const result = await db.from('care_tasks').delete().eq('id', taskParams.taskId).eq('hospital_id', hospitalId).eq('status', 'draft');
      if (result.error) throw result.error;
      return ok({ deleted: true });
    }
  }

  const taskCheckin = routeMatch(path, '/tasks/:taskId/checkins');
  if (taskCheckin && method === 'POST') {
    const { db } = await ownerContext(identity);
    const body = await readJson(request);
    const task = await db.from('care_tasks').select('id,pet_id').eq('id', taskCheckin.taskId).single();
    if (task.error) throw Object.assign(new Error('任务不存在或无权访问'), { status: 404, code: 'TASK_NOT_FOUND' });
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.from('care_task_completions').upsert({ task_id: task.data.id, pet_id: task.data.pet_id, completed_by: identity.userId, scheduled_for: `${today}T00:00:00.000Z`, status: body.status || 'completed', note: body.note || null, completed_at: new Date().toISOString() }, { onConflict: 'task_id,scheduled_for' }).select('*').single();
    if (result.error) throw result.error;
    return ok({ item: result.data }, 201);
  }

  if (path === '/ai/chat' && method === 'POST') {
    if (identity.role !== 'pet_owner') throw Object.assign(new Error('AI护理问答仅面向宠主'), { status: 403, code: 'PET_OWNER_REQUIRED' });
    const body = await readJson(request);
    let pet = null;
    if (body.petId) pet = (await assertPet(identity, body.petId)).pet;
    return ok(await answerWithKnowledge(required(body.question, '问题').slice(0, 2000), pet));
  }

  // Compatibility endpoints used by the current mini-program pages.
  if (path === '/owner/dashboard' && method === 'GET') {
    const list = await petList(identity);
    const pet = list.items[0] || null;
    if (!pet) return ok({ pet: null, taskCount: 0, completedCount: 0 });
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await list.db.from('care_tasks').select('id').eq('pet_id', pet.id).eq('status', 'active').lte('starts_on', today).or(`ends_on.is.null,ends_on.gte.${today}`);
    if (tasks.error) throw tasks.error;
    const ids = (tasks.data || []).map((item) => item.id);
    const completed = ids.length ? await list.db.from('care_task_completions').select('id', { count: 'exact', head: true }).in('task_id', ids).gte('scheduled_for', `${today}T00:00:00Z`).eq('status', 'completed') : { count: 0, error: null };
    if (completed.error) throw completed.error;
    return ok({ pet, taskCount: ids.length, completedCount: completed.count || 0 });
  }
  if (path === '/owner/care-tasks' && method === 'GET') {
    const result = await handleRoute({ request: { ...request, method: 'GET' }, url, path: '/tasks/today', identity });
    const items = result.body.items || [];
    return ok({ petId: items[0]?.pet_id || '', items: items.map((item) => ({ ...item, completed: item.completion?.status === 'completed', status_label: item.completion?.status === 'completed' ? '已完成' : '待执行' })) });
  }
  const oldTaskCompletion = routeMatch(path, '/owner/care-tasks/:taskId/complete');
  if (oldTaskCompletion && method === 'POST') return handleRoute({ request, url, path: `/tasks/${oldTaskCompletion.taskId}/checkins`, identity });
  if (path === '/owner/checkins') {
    const list = await petList(identity);
    const body = method === 'POST' ? await readJson(request) : {};
    const petId = body.petId || list.items[0]?.id;
    if (!petId) return ok({ pets: list.items, items: [] });
    if (method === 'GET') {
      const result = await handleRoute({ request: { ...request, method: 'GET' }, url, path: `/pets/${petId}/checkins`, identity });
      return ok({ pets: list.items, items: result.body.items.map((item) => ({ ...item, pet_name: list.items.find((pet) => pet.id === item.pet_id)?.name, recorded_at_label: labelDate(item.recorded_at) })) });
    }
    if (method === 'POST') {
      const result = await list.db.from('health_checkins').insert({
        pet_id: petId, recorded_by: identity.userId, weight_kg: optionalNumber(body.weightKg, '体重'), water_ml: optionalNumber(body.waterMl, '饮水量'),
        appetite: body.appetite || null, spirit: body.spirit || null, urine_note: body.urineNote || null, stool_note: body.stoolNote || null,
        vomiting_count: Math.max(0, Number(body.vomitingCount || 0)), symptom_note: body.symptomNote || null, photo_paths: Array.isArray(body.photoPaths) ? body.photoPaths : []
      }).select('*').single();
      if (result.error) throw result.error;
      const pet = list.items.find((item) => item.id === petId);
      const analysis = await analyzeAndStoreCheckin(pet, result.data);
      return ok({ item: result.data, analysis }, 201);
    }
  }
  if (path === '/owner/reports' && method === 'GET') {
    const list = await petList(identity);
    const ids = list.items.map((pet) => pet.id);
    if (!ids.length) return ok({ items: [] });
    const reports = await list.db.from('lab_reports').select('*').in('pet_id', ids).order('created_at', { ascending: false });
    if (reports.error) throw reports.error;
    return ok({ items: (reports.data || []).map((item) => ({ ...item, collected_at_label: labelDate(item.collected_at || item.created_at), verified_label: item.verified_by ? '医生已核对' : '尚未核对' })) });
  }
  if (path === '/owner/reports/upload-ticket' && method === 'POST') {
    const list = await petList(identity);
    const body = await readJson(request);
    const petId = body.petId || list.items[0]?.id;
    if (!petId) throw Object.assign(new Error('请先建立宠物档案'), { status: 422, code: 'PET_REQUIRED' });
    const bucket = process.env.REPORTS_BUCKET || 'medical-reports';
    const objectPath = `${identity.userId}/${petId}/${randomUUID()}-${sanitizeFileName(body.fileName)}`;
    const signed = await admin().storage.from(bucket).createSignedUploadUrl(objectPath);
    if (signed.error) throw Object.assign(new Error('报告存储尚未配置'), { status: 503, code: 'STORAGE_NOT_CONFIGURED', details: signed.error.message });
    return ok({ petId, bucket, path: objectPath, signedUrl: signed.data.signedUrl, token: signed.data.token });
  }
  if (path === '/doctor/dashboard' && method === 'GET') {
    const { db, membership, hospitalId } = await doctorContext(identity);
    const cases = await db.from('medical_cases').select('id', { count: 'exact' }).eq('hospital_id', hospitalId).in('status', ['active','follow_up']);
    if (cases.error) throw cases.error;
    const followups = await db.from('follow_up_reminders').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).eq('status', 'scheduled');
    if (followups.error) throw followups.error;
    const caseIds = (cases.data || []).map((item) => item.id);
    const alerts = caseIds.length
      ? await db.from('health_alerts').select('id', { count: 'exact', head: true }).in('case_id', caseIds).in('status', ['open','acknowledged'])
      : { count: 0, error: null };
    if (alerts.error) throw alerts.error;
    return ok({ hospital: membership.hospitals, stats: { cases: cases.count || 0, alerts: alerts.count || 0, followups: followups.count || 0 } });
  }
  if (path === '/doctor/cases' && method === 'GET') {
    const result = await handleRoute({ request: { ...request, method: 'GET' }, url, path: '/cases', identity });
    return ok({ items: result.body.items.map((item) => ({ ...item.pets, case_id: item.id, latest_status: item.status, diagnosis: item.diagnosis, disease_stage: item.disease_stage })) });
  }
  if (path === '/doctor/execution' && method === 'GET') {
    const { db, hospitalId } = await doctorContext(identity);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') || 7)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const cases = await db.from('medical_cases').select('id,pet_id,pets(id,name)').eq('hospital_id', hospitalId).in('status', ['active','follow_up']);
    if (cases.error) throw cases.error;
    const items = await Promise.all((cases.data || []).map(async (caseItem) => {
      const [checkins, completions, alerts] = await Promise.all([
        db.from('health_checkins').select('id', { count: 'exact', head: true }).eq('pet_id', caseItem.pet_id).gte('recorded_at', since),
        db.from('care_task_completions').select('id,status', { count: 'exact' }).eq('pet_id', caseItem.pet_id).gte('scheduled_for', since),
        db.from('health_alerts').select('severity,title,created_at').eq('case_id', caseItem.id).in('status', ['open','acknowledged']).order('created_at', { ascending: false }).limit(1)
      ]);
      if (checkins.error) throw checkins.error;
      if (completions.error) throw completions.error;
      if (alerts.error) throw alerts.error;
      const completed = (completions.data || []).filter((item) => item.status === 'completed').length;
      const latestAlert = alerts.data?.[0] || null;
      const riskLevel = latestAlert?.severity === 'urgent' ? 'red' : latestAlert ? 'yellow' : 'green';
      const riskLabel = riskLevel === 'red' ? '需要关注' : riskLevel === 'yellow' ? '等待处理' : '稳定';
      return { pet_id: caseItem.pet_id, pet_name: caseItem.pets?.name || '未命名宠物', completed, scheduled: completions.count || 0, checkins: checkins.count || 0, risk_level: riskLevel, risk_label: riskLabel, summary: latestAlert?.title || '当前没有未处理异常；结论仅基于已提交记录。', doctor_action: latestAlert ? '打开病例详情核对原始记录并留痕处理。' : '无需主动处理，按护理计划继续随访。' };
    }));
    return ok({ items });
  }
  if (path === '/doctor/followups') {
    const { db, hospitalId } = await doctorContext(identity);
    const cases = await db.from('medical_cases').select('id,pet_id,pets(id,name)').eq('hospital_id', hospitalId).in('status', ['active','follow_up']);
    if (cases.error) throw cases.error;
    if (method === 'GET') {
      const reminders = await db.from('follow_up_reminders').select('*').eq('hospital_id', hospitalId).order('due_at');
      if (reminders.error) throw reminders.error;
      const names = new Map((cases.data || []).map((item) => [item.pet_id, item.pets?.name || '未命名宠物']));
      return ok({ cases: (cases.data || []).map((item) => ({ id: item.pet_id, name: item.pets?.name || '未命名宠物' })), items: (reminders.data || []).map((item) => ({ ...item, pet_name: names.get(item.pet_id), due_at_label: labelDate(item.due_at) })) });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const result = await db.from('follow_up_reminders').insert({ hospital_id: hospitalId, pet_id: required(body.petId, '病例'), created_by: identity.userId, due_at: isoDate(body.dueAt, '复诊时间'), reason: required(body.reason, '复诊原因') }).select('*').single();
      if (result.error) throw result.error;
      return ok({ item: result.data }, 201);
    }
  }

  const adminResult = await handleAdminRoute({ request, url, path, identity });
  if (adminResult) return adminResult;

  return notFound();
}
