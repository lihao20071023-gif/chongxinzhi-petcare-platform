'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, loadSession, saveSession } from '@/lib/api';
import type { DashboardData, Hospital, HospitalApplication, KnowledgeEntry, Session, SystemSetting } from '@/lib/types';
import { AppShell, type AdminView } from './app-shell';
import { DashboardView } from './dashboard-view';
import { HospitalsView } from './hospitals-view';
import { KnowledgeView } from './knowledge-view';
import { LoginScreen } from './login-screen';
import { SettingsView } from './settings-view';
import { BusinessDataView } from './business-data-view';
import { Toast } from './ui';
import { isLocalSession, loadLocalWorkspace, localDashboard, saveLocalWorkspace } from '@/lib/local-admin';

type LoadState = { loading: boolean; error: string };
const initialLoad: LoadState = { loading: false, error: '' };
const previewSession: Session = { accessToken: 'local-preview', expiresAt: 0, user: { id: 'local-preview', email: '未连接真实账号', displayName: '开发者界面预览', role: 'admin' } };
const previewDashboard: DashboardData = {
  metrics: { users: 0, dailyActiveUsers: 0, cases: 0, checkinCompletionRate: 0 },
  metricDefinitions: { dailyActiveUsers: '接入 API 后显示最近 24 小时真实活跃用户', checkinCompletionRate: '接入 API 后按真实护理任务计算' },
  activitySeries: [], pending: { hospitals: 0, knowledge: 0 }
};

export function AdminConsole() {
  const [session, setSession] = useState<Session | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<AdminView>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [load, setLoad] = useState<Record<AdminView, LoadState>>({ dashboard: initialLoad, business: initialLoad, knowledge: initialLoad, hospitals: initialLoad, settings: initialLoad });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [applications, setApplications] = useState<HospitalApplication[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { setSession(loadSession()); setReady(true); }, []);

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      saveSession(null); setSession(null); setToast({ type: 'error', message: '登录已失效或账号没有管理员权限。' }); return true;
    }
    return false;
  }, []);

  const loadView = useCallback(async (target: AdminView, currentSession: Session) => {
    setLoad((value) => ({ ...value, [target]: { loading: true, error: '' } }));
    try {
      if (isLocalSession(currentSession)) {
        const local = loadLocalWorkspace();
        if (target === 'dashboard') setDashboard(localDashboard());
        if (target === 'knowledge') setKnowledge(local.knowledge);
        if (target === 'hospitals') { setHospitals(local.hospitals); setApplications(local.applications); }
        if (target === 'settings') setSettings(local.settings);
        setLoad((value) => ({ ...value, [target]: initialLoad }));
        return;
      }
      if (target === 'dashboard') setDashboard(await api<DashboardData>('/admin/dashboard', {}, currentSession.accessToken));
      if (target === 'knowledge') setKnowledge((await api<{ items: KnowledgeEntry[] }>('/admin/knowledge', {}, currentSession.accessToken)).items);
      if (target === 'hospitals') {
        const data = await api<{ items: Hospital[]; applications: HospitalApplication[] }>('/admin/hospitals', {}, currentSession.accessToken);
        setHospitals(data.items); setApplications(data.applications);
      }
      if (target === 'settings') setSettings((await api<{ items: SystemSetting[] }>('/admin/settings', {}, currentSession.accessToken)).items);
      setLoad((value) => ({ ...value, [target]: initialLoad }));
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoad((value) => ({ ...value, [target]: { loading: false, error: error instanceof Error ? error.message : '读取失败' } }));
    }
  }, [handleAuthError]);

  useEffect(() => { if (session && !previewMode) void loadView(view, session); }, [session, previewMode, view, loadView]);

  function logout() { saveSession(null); setSession(null); setPreviewMode(false); }
  function notify(message: string) { setToast({ type: 'success', message }); }
  function fail(error: unknown) { setToast({ type: 'error', message: error instanceof Error ? error.message : '操作失败' }); }

  async function saveKnowledge(value: Partial<KnowledgeEntry> & { triggerTerms?: string }, id?: string) {
    if (!session) return;
    const payload = {
      slug: value.slug, title: value.title, species: value.species, disease: value.disease, stage: value.stage,
      scenario: value.scenario, triggerTerms: String(value.triggerTerms || '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
      coreConclusion: value.core_conclusion, applicability: value.applicability, ownerExplanation: value.owner_explanation,
      nextAction: value.next_action, forbiddenInference: value.forbidden_inference, sourceTitle: value.source_title,
      sourceOrganization: value.source_organization, sourceYear: value.source_year, sourceUrl: value.source_url,
      reviewStatus: value.review_status, reviewDueOn: value.review_due_on
    };
    try {
      if (isLocalSession(session)) {
        const local = loadLocalWorkspace();
        const existing = id ? local.knowledge.find((item) => item.id === id) : undefined;
        const item: KnowledgeEntry = {
          id: existing?.id || `local-knowledge-${Date.now()}`,
          slug: String(payload.slug || '').trim(), title: String(payload.title || '').trim(), species: (payload.species || 'both') as KnowledgeEntry['species'],
          disease: String(payload.disease || '').trim(), stage: payload.stage || null, scenario: String(payload.scenario || '').trim(), trigger_terms: payload.triggerTerms,
          core_conclusion: String(payload.coreConclusion || '').trim(), applicability: String(payload.applicability || '').trim(), owner_explanation: String(payload.ownerExplanation || '').trim(),
          next_action: String(payload.nextAction || '').trim(), forbidden_inference: String(payload.forbiddenInference || '').trim(), source_title: String(payload.sourceTitle || '').trim(),
          source_organization: payload.sourceOrganization || null, source_year: payload.sourceYear ? Number(payload.sourceYear) : null, source_url: payload.sourceUrl || null,
          review_status: (payload.reviewStatus || 'draft') as KnowledgeEntry['review_status'], review_due_on: payload.reviewDueOn || null,
          version: (existing?.version || 0) + 1, updated_at: new Date().toISOString()
        };
        if (!item.slug || !item.title || !item.disease || !item.scenario || !item.core_conclusion || !item.applicability || !item.owner_explanation || !item.next_action || !item.forbidden_inference || !item.source_title) throw new Error('请填写所有必填知识字段');
        local.knowledge = [item, ...local.knowledge.filter((entry) => entry.id !== item.id)];
        saveLocalWorkspace(local); setKnowledge(local.knowledge); notify(id ? '知识条目已更新到本机。' : '知识条目已保存到本机。'); setDashboard(localDashboard()); return;
      }
      await api(id ? `/admin/knowledge/${id}` : '/admin/knowledge', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }, session.accessToken);
      notify(id ? '知识条目已更新并记录新版本。' : '知识条目已创建。'); await loadView('knowledge', session); await loadView('dashboard', session);
    } catch (error) { fail(error); throw error; }
  }

  async function deleteKnowledge(item: KnowledgeEntry) {
    if (!session || !window.confirm(`确认删除“${item.title}”吗？此操作会写入审计记录。`)) return;
    try {
      if (isLocalSession(session)) { const local = loadLocalWorkspace(); local.knowledge = local.knowledge.filter((entry) => entry.id !== item.id); saveLocalWorkspace(local); setKnowledge(local.knowledge); notify('知识条目已从本机删除。'); return; }
      await api(`/admin/knowledge/${item.id}`, { method: 'DELETE' }, session.accessToken); notify('知识条目已删除。'); await loadView('knowledge', session);
    } catch (error) { fail(error); }
  }

  async function reviewApplication(id: string, approve: boolean, note: string) {
    if (!session) return;
    try {
      if (isLocalSession(session)) { const local = loadLocalWorkspace(); local.applications = local.applications.map((item) => item.id === id ? { ...item, status: approve ? 'approved' : 'rejected' } : item); saveLocalWorkspace(local); setApplications(local.applications); notify(approve ? '本机申请已标记通过。' : '本机申请已标记不通过。'); return; }
      await api(`/admin/hospital-applications/${id}/review`, { method: 'POST', body: JSON.stringify({ approve, note }) }, session.accessToken); notify(approve ? '入驻申请已通过并完成医院绑定。' : '入驻申请已驳回。'); await loadView('hospitals', session); await loadView('dashboard', session);
    } catch (error) { fail(error); throw error; }
  }

  async function updateHospital(id: string, value: { status?: string; moderationStatus?: string; isPublished?: boolean; note?: string }) {
    if (!session) return;
    try {
      if (isLocalSession(session)) { const local = loadLocalWorkspace(); local.hospitals = local.hospitals.map((item) => item.id === id ? { ...item, status: value.status || item.status, profile: item.profile ? { ...item.profile, moderation_status: value.moderationStatus || item.profile.moderation_status, is_published: value.isPublished ?? item.profile.is_published } : item.profile } : item); saveLocalWorkspace(local); setHospitals(local.hospitals); notify('医院状态已保存到本机。'); return; }
      await api(`/admin/hospitals/${id}`, { method: 'PATCH', body: JSON.stringify(value) }, session.accessToken); notify('医院状态已更新。'); await loadView('hospitals', session);
    } catch (error) { fail(error); throw error; }
  }

  async function saveSettings(aiSafetyRules: Record<string, unknown>, reminderRules: Record<string, unknown>) {
    if (!session) return;
    try {
      const mandatory = { ...aiSafetyRules, noDiagnosis: true, noMedicationChange: true, urgentEscalation: true, requireKnowledgeSources: true };
      if (isLocalSession(session)) { const local = loadLocalWorkspace(); local.settings = [{ key: 'ai_safety_rules', value: mandatory, description: '平台强制安全底线，不允许关闭', updated_at: new Date().toISOString() }, { key: 'reminder_rules', value: reminderRules, description: '院后护理打卡、趋势和医生复核时限', updated_at: new Date().toISOString() }]; saveLocalWorkspace(local); setSettings(local.settings); notify('规则已保存到本机；强制安全底线始终生效。'); return; }
      const result = await api<{ items: SystemSetting[] }>('/admin/settings', { method: 'PATCH', body: JSON.stringify({ aiSafetyRules: mandatory, reminderRules }) }, session.accessToken); setSettings(result.items); notify('系统配置已保存，后端安全规则即时生效。');
    } catch (error) { fail(error); throw error; }
  }

  if (!ready) return <div className="boot-screen">正在启动宠馨智管理后台…</div>;
  if (!session && !previewMode) return <><LoginScreen onLogin={setSession} onPreview={() => setPreviewMode(true)} />{toast ? <Toast type={toast.type} onClose={() => setToast(null)}>{toast.message}</Toast> : null}</>;
  const activeSession=session||previewSession;
  return <>
    <AppShell session={activeSession} view={view} mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((value) => !value)} onView={setView} onLogout={logout}>
      {previewMode ? <div className="preview-banner"><strong>本机界面预览</strong><span>预览不会授予修改权限；“业务与数据”只读取当前浏览器已经保存的真实记录，不填充虚构用户、病例或合作医院。</span></div> : null}
      {view === 'dashboard' ? <DashboardView data={previewMode?previewDashboard:dashboard} loading={previewMode?false:load.dashboard.loading} error={previewMode?'':load.dashboard.error} onNavigate={setView} /> : null}
      {view === 'business' ? <BusinessDataView localMode={previewMode || isLocalSession(session)} /> : null}
      {view === 'knowledge' ? <KnowledgeView items={knowledge} loading={load.knowledge.loading} error={load.knowledge.error} onSave={saveKnowledge} onDelete={deleteKnowledge} /> : null}
      {view === 'hospitals' ? <HospitalsView items={hospitals} applications={applications} loading={load.hospitals.loading} error={load.hospitals.error} onReviewApplication={reviewApplication} onUpdateHospital={updateHospital} /> : null}
      {view === 'settings' ? <SettingsView items={settings} loading={load.settings.loading} error={load.settings.error} onSave={saveSettings} /> : null}
    </AppShell>
    {toast ? <Toast type={toast.type} onClose={() => setToast(null)}>{toast.message}</Toast> : null}
  </>;
}
