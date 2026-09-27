'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  CloudOff,
  Cpu,
  FileText,
  HardDrive,
  Home,
  PackageSearch,
  PawPrint,
  RotateCcw,
  Save,
  ScrollText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { HospitalDirectoryAdmin } from './hospital-directory-admin';

const STORAGE_KEY = 'petcare-developer-module-config-v1';

type ModuleId =
  | 'monitor'
  | 'ai'
  | 'report'
  | 'care-plan'
  | 'care-network'
  | 'knowledge'
  | 'marketplace'
  | 'hardware';

type ModuleSetting = { enabled: boolean; label: string };
type ModuleConfig = Record<ModuleId, ModuleSetting>;

type ModuleDefinition = {
  id: ModuleId;
  defaultLabel: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  iconTone: string;
};

type AdminAreaId = 'credential' | 'knowledge' | 'products' | 'audit';

type AdminArea = {
  id: AdminAreaId;
  title: string;
  description: string;
  connection: string;
  icon: LucideIcon;
  checklist: string[];
};

const modules: ModuleDefinition[] = [
  { id: 'monitor', defaultLabel: '健康监测', description: '体重、饮水、排尿与居家指标记录', icon: Activity, tone: 'border-[#cde5d8] bg-[#f3faf6]', iconTone: 'bg-[#dcf1e5] text-[#247354]' },
  { id: 'ai', defaultLabel: 'AI 管家', description: '整理记录与提醒，不替医生做诊疗决策', icon: Bot, tone: 'border-[#d8d2ee] bg-[#f8f6fc]', iconTone: 'bg-[#ebe6f7] text-[#705a9b]' },
  { id: 'report', defaultLabel: '检查报告', description: '保存并归类医院检查资料', icon: FileText, tone: 'border-[#cddfeb] bg-[#f3f8fb]', iconTone: 'bg-[#e1edf5] text-[#3c718e]' },
  { id: 'care-plan', defaultLabel: '护理方案', description: '查看医生确认后的院后护理任务', icon: ClipboardList, tone: 'border-[#eedcbf] bg-[#fdf9f1]', iconTone: 'bg-[#f8ead0] text-[#9b681f]' },
  { id: 'care-network', defaultLabel: '找医院与协同', description: '匹配已核验医院，就诊后继续授权协同', icon: Stethoscope, tone: 'border-[#cde5d8] bg-[#f3faf6]', iconTone: 'bg-[#dcf1e5] text-[#247354]' },
  { id: 'knowledge', defaultLabel: '知识库', description: '面向宠主的慢性病护理科普', icon: BookOpen, tone: 'border-[#d8d2ee] bg-[#f8f6fc]', iconTone: 'bg-[#ebe6f7] text-[#705a9b]' },
  { id: 'marketplace', defaultLabel: '商城', description: '处方粮与护理用品入口', icon: ShoppingBag, tone: 'border-[#eedcbf] bg-[#fdf9f1]', iconTone: 'bg-[#f8ead0] text-[#9b681f]' },
  { id: 'hardware', defaultLabel: '智能硬件', description: '家庭检测设备与数据同步入口', icon: Cpu, tone: 'border-[#cddfeb] bg-[#f3f8fb]', iconTone: 'bg-[#e1edf5] text-[#3c718e]' },
];

const defaultConfig = Object.fromEntries(
  modules.map((item) => [item.id, { enabled: true, label: item.defaultLabel }]),
) as ModuleConfig;

const adminAreas: AdminArea[] = [
  {
    id: 'credential',
    title: '医院 / 医生资质审核',
    description: '核验合作机构、执业人员与授权范围',
    connection: '需接入医院与人员认证服务',
    icon: UserCheck,
    checklist: ['医院主体与许可证资料', '医生身份与执业资质', '审核记录、驳回原因与有效期'],
  },
  {
    id: 'knowledge',
    title: '知识库版本',
    description: '管理专业内容的来源、审核与发布版本',
    connection: '需接入内容管理与版本服务',
    icon: BookOpen,
    checklist: ['知识来源与适用对象', '医生审核人与审核时间', '发布、回退与历史版本'],
  },
  {
    id: 'products',
    title: '商品管理',
    description: '维护商品资料、适用说明和展示状态',
    connection: '需接入商品与订单服务',
    icon: PackageSearch,
    checklist: ['商品主体与基础资料', '适用范围及风险提示', '上下架、库存与订单状态'],
  },
  {
    id: 'audit',
    title: '权限审计',
    description: '追踪成员权限、敏感操作与数据访问',
    connection: '需接入身份权限与审计日志服务',
    icon: ScrollText,
    checklist: ['角色与最小权限配置', '数据访问授权与撤回', '关键操作日志和异常告警'],
  },
];

function normalizeConfig(value: unknown): ModuleConfig {
  const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    modules.map((item) => {
      const raw = candidate[item.id];
      const saved = raw && typeof raw === 'object' ? (raw as Partial<ModuleSetting>) : {};
      const label = typeof saved.label === 'string' && saved.label.trim() ? saved.label.trim().slice(0, 12) : item.defaultLabel;
      return [item.id, { enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true, label }];
    }),
  ) as ModuleConfig;
}

export function DeveloperWorkspace() {
  const [config, setConfig] = useState<ModuleConfig>(defaultConfig);
  const [savedConfig, setSavedConfig] = useState<ModuleConfig>(defaultConfig);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeArea, setActiveArea] = useState<AdminAreaId>('credential');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const next = normalizeConfig(stored ? JSON.parse(stored) : defaultConfig);
      setConfig(next);
      setSavedConfig(next);
    } catch {
      setConfig(defaultConfig);
      setSavedConfig(defaultConfig);
    }
    setReady(true);
  }, []);

  const enabledModules = useMemo(
    () => modules.filter((item) => config[item.id].enabled),
    [config],
  );
  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const selectedArea = adminAreas.find((item) => item.id === activeArea) ?? adminAreas[0];

  const updateModule = (id: ModuleId, next: Partial<ModuleSetting>) => {
    setSaved(false);
    setConfig((current) => ({ ...current, [id]: { ...current[id], ...next } }));
  };

  const saveConfig = () => {
    const next = normalizeConfig(config);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfig(next);
    setSavedConfig(next);
    setSaved(true);
  };

  const resetConfig = () => {
    setSaved(false);
    setConfig(normalizeConfig(defaultConfig));
  };

  const setAllModules = (enabled: boolean) => {
    setSaved(false);
    setConfig((current) => Object.fromEntries(
      modules.map((item) => [item.id, { ...current[item.id], enabled }]),
    ) as ModuleConfig);
  };

  return (
    <div className="min-h-screen bg-[#f2f5f3] text-[#20352b]">
      <header className="border-b border-[#dfe7e2] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#244d3c] text-white"><Settings2 size={20} /></span>
            <div>
              <p className="text-sm font-bold">宠馨智 · 开发者管理端</p>
              <p className="text-xs text-[#74827b]">独立Web管理后台（不放入微信小程序）</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-xs font-semibold">
            <a href="portal.html" className="rounded-lg border border-[#dbe4df] bg-[#f3f7f5] px-3 py-2.5">系统总览</a>
            <a href="index.html" className="flex items-center gap-1.5 rounded-lg border border-[#dbe4df] bg-white px-3 py-2.5 hover:border-[#8caf9d]"><Home size={15} />宠主功能预览</a>
            <a href="hospital.html" className="flex items-center gap-1.5 rounded-lg bg-[#2b7054] px-3 py-2.5 text-white hover:bg-[#225c45]"><Building2 size={15} />医生功能预览</a>
          </nav>
        </div>
      </header>

      <main className={`mx-auto max-w-[1440px] p-5 transition-opacity sm:p-7 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <section className="mb-6 overflow-hidden rounded-2xl border border-[#e4d29d] bg-[#fff9e9]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0bd] text-[#8a6514]"><CloudOff size={20} /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-[#493d21]">Web管理后台界面原型</h1>
                  <span className="rounded-full border border-[#e4c970] bg-white px-2.5 py-1 text-[11px] font-bold text-[#82600d]">统一API尚未部署</span>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#746540]">这里是独立于微信小程序的电脑端管理界面。当前界面配置仍保存在本机；数据库、统一API和管理员接口已经建立代码骨架，但部署并配置管理员账号后才会出现真实数据。</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-[#746540]"><HardDrive size={15} />配置保存在本机浏览器</div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
          <section className="rounded-2xl border border-[#dfe7e2] bg-white shadow-[0_12px_36px_rgba(39,73,57,.06)]">
            <div className="flex flex-col gap-4 border-b border-[#e6ece8] p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><SlidersHorizontal size={19} className="text-[#2b7054]" /><h2 className="font-bold">宠主端「更多服务」配置</h2></div>
                <p className="mt-1.5 text-sm leading-6 text-[#6d7d74]">决定宠物主人能看到哪些辅助模块，也可以调整入口名称。</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAllModules(false)} className="rounded-lg border border-[#dbe4df] px-3 py-2 text-xs font-semibold text-[#587066]">全部隐藏</button>
                <button type="button" onClick={() => setAllModules(true)} className="rounded-lg border border-[#dbe4df] px-3 py-2 text-xs font-semibold text-[#2b7054]">全部显示</button>
              </div>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2">
              {modules.map((item) => {
                const Icon = item.icon;
                const setting = config[item.id];
                return (
                  <article key={item.id} className={`rounded-xl border p-4 transition-opacity ${item.tone} ${setting.enabled ? '' : 'opacity-60 grayscale-[.2]'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.iconTone}`}><Icon size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <label htmlFor={`module-${item.id}`} className="text-xs font-semibold text-[#65766d]">模块名称</label>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={setting.enabled}
                            aria-label={`${setting.enabled ? '隐藏' : '显示'}${setting.label}`}
                            onClick={() => updateModule(item.id, { enabled: !setting.enabled })}
                            className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 ${setting.enabled ? 'bg-[#2b7a59]' : 'bg-[#b8c2bd]'}`}
                          >
                            <span className={`block size-5 rounded-full bg-white shadow-sm transition-transform ${setting.enabled ? 'translate-x-5' : ''}`} />
                          </button>
                        </div>
                        <input
                          id={`module-${item.id}`}
                          value={setting.label}
                          maxLength={12}
                          onChange={(event) => updateModule(item.id, { label: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm font-bold text-[#294638] outline-none focus:border-[#5c9a7d]"
                        />
                        <p className="mt-2 text-xs leading-5 text-[#708078]">{item.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e6ece8] bg-[#fafcfb] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#6d7d74]">
                {saved ? <span className="flex items-center gap-1.5 font-semibold text-[#257153]"><Check size={15} />已保存到本机，宠主端刷新后生效</span> : isDirty ? '有尚未保存的修改' : '当前配置已保存'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={resetConfig} className="flex items-center gap-1.5 rounded-lg border border-[#d5dfd9] bg-white px-4 py-2.5 text-sm font-semibold text-[#50665b]"><RotateCcw size={16} />恢复默认</button>
                <button type="button" onClick={saveConfig} disabled={!isDirty} className="flex items-center gap-1.5 rounded-lg bg-[#287555] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#aab8b1]"><Save size={16} />保存配置</button>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-[#dfe7e2] bg-white p-5 shadow-[0_12px_36px_rgba(39,73,57,.06)]">
            <div className="flex items-center gap-2"><PawPrint size={19} className="text-[#c18735]" /><h2 className="font-bold">宠主端入口预览</h2></div>
            <p className="mt-1.5 text-sm leading-6 text-[#6d7d74]">这里只预览名称和显示状态，不会写入宠物健康数据。</p>
            <div className="mt-5 rounded-[22px] border-[6px] border-[#263c32] bg-[#f6faf7] p-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#e3ebe6] pb-3">
                <div><p className="text-[10px] text-[#77857e]">宠馨智</p><p className="text-sm font-bold">更多服务</p></div>
                <span className="rounded-full bg-[#e0f0e7] px-2 py-1 text-[10px] font-semibold text-[#2b7054]">宠主端</span>
              </div>
              {enabledModules.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {enabledModules.map((item) => {
                    const Icon = item.icon;
                    return <div key={item.id} className="rounded-xl border border-[#e0e8e3] bg-white p-3"><Icon size={17} className="text-[#2d7657]" /><p className="mt-2 truncate text-xs font-bold">{config[item.id].label || item.defaultLabel}</p></div>;
                  })}
                </div>
              ) : (
                <div className="grid min-h-52 place-items-center text-center text-xs leading-5 text-[#829087]">当前没有显示的<br />更多服务模块</div>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f0f5f2] p-3 text-xs leading-5 text-[#65756d]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#37775b]" />宠物档案和首页框架始终保留；其余模块可按试点阶段显示、隐藏或改名。</div>
          </aside>
        </div>

        <HospitalDirectoryAdmin />

        <section className="mt-6 rounded-2xl border border-[#dfe7e2] bg-white p-5 shadow-[0_12px_36px_rgba(39,73,57,.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-[#2b7054]" /><h2 className="font-bold">后台管理接入</h2></div>
              <p className="mt-1.5 text-sm leading-6 text-[#6d7d74]">以下为开发者端独立管理范围。目前均为空入口，接入真实服务并完成权限控制后才展示数据。</p>
            </div>
            <span className="w-fit rounded-full bg-[#f4e8df] px-3 py-1.5 text-xs font-bold text-[#935838]">4 项均未连接</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {adminAreas.map((area) => {
              const Icon = area.icon;
              const selected = area.id === activeArea;
              return (
                <button key={area.id} type="button" onClick={() => setActiveArea(area.id)} className={`rounded-xl border p-4 text-left ${selected ? 'border-[#5c9478] bg-[#f1f8f4] shadow-sm' : 'border-[#e0e7e3] bg-white hover:border-[#9db7aa]'}`}>
                  <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf3ef] text-[#376f56]"><Icon size={19} /></span><span className="rounded-full bg-[#f4e8df] px-2 py-1 text-[10px] font-bold text-[#935838]">未连接</span></div>
                  <h3 className="mt-3 text-sm font-bold">{area.title}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-[#718078]">{area.description}</p>
                  <span className="mt-3 flex items-center gap-1 text-xs font-bold text-[#2d7055]">查看接入要求<ChevronRight size={14} /></span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-5 rounded-xl border border-dashed border-[#bdcbc3] bg-[#fafcfb] p-5 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold text-[#7b8981]">当前选择</p>
              <h3 className="mt-1 text-base font-bold">{selectedArea.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#66776e]">{selectedArea.connection}</p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#ead5ca] bg-[#fff8f4] p-3 text-xs text-[#8a573c]"><CloudOff size={16} />无可展示的真实记录</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7b8981]">正式接入需具备</p>
              <ul className="mt-2 space-y-2">
                {selectedArea.checklist.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-[#52685d]"><span className="size-1.5 rounded-full bg-[#5e9379]" />{item}</li>)}
              </ul>
              <button type="button" disabled className="mt-4 flex items-center gap-2 rounded-lg bg-[#d9e0dc] px-4 py-2.5 text-sm font-semibold text-[#78847e]"><CloudOff size={16} />等待后台接入<ArrowRight size={15} /></button>
            </div>
          </div>
        </section>

        <footer className="mt-6 flex flex-col gap-2 border-t border-[#d9e2dd] py-5 text-xs leading-5 text-[#718078] sm:flex-row sm:items-center sm:justify-between">
          <span>本页面不提供诊疗建议，也不会替医生审核或自动通过任何资质。</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} />真实后台需接入登录、权限、审计与数据协议</span>
        </footer>
      </main>
    </div>
  );
}
