'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck2,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileSignature,
  FolderHeart,
  HeartPulse,
  Home,
  LockKeyhole,
  NotebookTabs,
  PawPrint,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';

type TaskKey = 'medicine' | 'food' | 'observe';
type RecordChoice = '正常' | '一般' | '下降';
type CarePath = 'hospital' | 'home' | null;

const demoHospitals = ['示例原就诊医院', '示例肾病转诊医院'] as const;

const flowSteps = [
  { title: '微信登录', detail: '识别宠主角色', icon: UserRound },
  { title: '建立档案', detail: '只填当前需要的信息', icon: PawPrint },
  { title: '选择当前方式', detail: '随病程阶段自由切换', icon: LockKeyhole },
  { title: '建立护理依据', detail: '医生方案或知识库建议', icon: FileSignature },
  { title: '执行护理', detail: '拆成今日任务', icon: ClipboardCheck },
  { title: '记录状态', detail: '无设备也能完成', icon: Activity },
  { title: '保存反馈', detail: '变化和处理状态可见', icon: FileCheck2 },
  { title: '风险分流', detail: '医院回传或就医建议', icon: AlertTriangle },
  { title: '建议更新', detail: '按所选路径更新下一步', icon: Stethoscope },
  { title: '结果复核', detail: '趋势与复诊结果复核', icon: CalendarCheck2 },
] as const;

const taskDefinitions: Array<{ key: TaskKey; time: string; title: string; detail: string }> = [
  { key: 'medicine', time: '08:00', title: '按医生处方完成用药', detail: '具体药物与剂量以签署方案为准' },
  { key: 'food', time: '12:00', title: '按方案提供处方饮食', detail: '记录是否完成，不自行改变方案' },
  { key: 'observe', time: '18:00', title: '观察食欲、精神与排尿', detail: '无需专业设备也可以记录' },
];

const homeTaskDefinitions: Array<{ key: TaskKey; time: string; title: string; detail: string }> = [
  { key: 'medicine', time: '08:00', title: '确认原有医嘱是否按时完成', detail: '只记录执行情况，不新增、停用或调整药物' },
  { key: 'food', time: '12:00', title: '记录饮食完成与食欲变化', detail: '保持已确认饮食安排，不因AI建议自行换药或换处方粮' },
  { key: 'observe', time: '18:00', title: '观察精神、排尿与呕吐情况', detail: '无需专业设备，也能完成基础观察' },
];

const feedbackByStep = [
  ['登录成功后明确显示角色', '登录失败时给出原因和重试入口', '正式版由服务端判断角色'],
  ['保存后显示宠物档案编号', '缺少关键字段时指出具体项目', '不自动填充不存在的病例数据'],
  ['护理方式不是一次性选择', '医院授权与当前护理方式分开管理', '切换方式不删除历史档案'],
  ['方案显示医生、医院和版本', '没有医生签署就不能生效', 'AI只能拆分已批准方案'],
  ['每项任务有时间和执行说明', '记录具体执行人与完成时间', '药物任务不提供自行补服建议'],
  ['基础观察始终可用', '普通和专业设备按需展开', '没记录不能被判断为正常'],
  ['显示档案号和与上次变化', '说明是否通知医生', '给出预计处理时限'],
  ['红色立即关注、黄色待处理', '医生看到原始记录而非只有摘要', 'AI不替医生做临床判断'],
  ['每次修改形成新版本', '说明修改人、原因和生效时间', '次日任务同步新方案'],
  ['比较复诊指标与执行记录', '只展示证据，不宣传治愈率', '由医生决定继续或调整方案'],
] as const;

function feedbackForStep(step: number, carePath: CarePath): readonly string[] {
  if (carePath !== 'home') return feedbackByStep[step];
  const homeOverrides: Partial<Record<number, readonly string[]>> = {
    3: ['说明建议依据和适用条件', '缺少信息时先追问，不直接猜测', '不生成药物、剂量或诊断结论'],
    4: ['任务来源标明为居家护理建议', '每项任务能完成或跳过并说明原因', 'AI不把未执行自动解释成病情恶化'],
    6: ['显示档案号和与上次变化', '明确当前由AI完成分析、未通知医院', '恶化时给出具体就医优先级'],
    7: ['给出继续观察与选择医院两个入口', '推荐依据可见，不做付费排名替代医疗匹配', '紧急症状直接提示就医'],
    8: ['只更新观察、饮食记录和提醒频率', '不独立增加、停用或调整药物', '风险持续时不以AI建议替代复诊'],
    9: ['展示7/14/30天趋势所需数据', '证据不足时明确说无法判断', '由医院检查确认疾病阶段和治疗调整'],
  };
  return homeOverrides[step] ?? feedbackByStep[step];
}

export function GuidedCareExperience() {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [petName, setPetName] = useState('豆豆');
  const [species, setSpecies] = useState<'猫' | '犬'>('猫');
  const [tasks, setTasks] = useState<Record<TaskKey, boolean>>({ medicine: false, food: false, observe: false });
  const [appetite, setAppetite] = useState<RecordChoice>('下降');
  const [spirit, setSpirit] = useState<RecordChoice>('一般');
  const [urination, setUrination] = useState<RecordChoice>('正常');
  const [showAi, setShowAi] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [carePath, setCarePath] = useState<CarePath>(null);
  const [hospitalAuthorized, setHospitalAuthorized] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<(typeof demoHospitals)[number]>(demoHospitals[0]);
  const [careHistory, setCareHistory] = useState<string[]>([]);

  const completeCount = useMemo(() => Object.values(tasks).filter(Boolean).length, [tasks]);
  const risk = appetite === '下降' || spirit === '下降' || urination === '下降';
  const isDoctorView = carePath === 'hospital' && (step === 7 || step === 8);
  const CurrentStepIcon = flowSteps[step].icon;
  const currentFeedback = feedbackForStep(step, carePath);

  const goTo = (next: number) => {
    const bounded = Math.max(0, Math.min(flowSteps.length - 1, next));
    setStep(bounded);
    setFurthest(current => Math.max(current, bounded));
    setShowAi(false);
    setShowArchive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseCareMode = (nextMode: Exclude<CarePath, null>) => {
    const nextLabel = nextMode === 'hospital' ? '医院协同居家护理' : '居家自主管理';
    if (carePath !== nextMode) {
      setCareHistory(current => [...current, `${current.length + 1}. 切换为${nextLabel}`]);
    }
    setCarePath(nextMode);
    setTasks({ medicine: false, food: false, observe: false });
    goTo(3);
  };

  const restart = () => {
    setStep(0);
    setFurthest(0);
    setTasks({ medicine: false, food: false, observe: false });
    setAppetite('下降');
    setSpirit('一般');
    setUrination('正常');
    setCarePath(null);
    setHospitalAuthorized(false);
    setSelectedHospital(demoHospitals[0]);
    setCareHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e7] text-[#253b32]">
      <header className="sticky top-0 z-50 border-b border-[#e6ded1] bg-[#fffaf3]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-7">
          <a href="portal.html" className="flex min-h-11 items-center gap-3 rounded-xl text-[#1e604a]">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[#1f8061] text-white"><PawPrint size={21}/></span>
            <span><b className="block text-sm">宠馨智闭环体验</b><small className="text-[11px] text-[#708078]">真实点击路径 · 体验数据</small></span>
          </a>
          <div className="flex items-center gap-2">
            <a href="visual-analysis.html" className="hidden min-h-11 items-center rounded-xl border border-[#d8e3dd] bg-white px-4 text-xs font-bold text-[#42685a] sm:flex">视觉分析</a>
            <span className="rounded-full bg-[#fff0d8] px-3 py-2 text-[10px] font-bold text-[#906225]">不连接真实医疗数据</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1320px] gap-6 px-3 py-5 sm:px-6 lg:grid-cols-[245px_430px_minmax(260px,1fr)] lg:items-start lg:justify-center lg:py-8">
        <aside className="order-2 rounded-[24px] border border-[#e4ddd1] bg-[#fffaf3] p-4 lg:order-1 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black tracking-[.18em] text-[#8a7251]">REAL FLOW</p><h1 className="mt-1 text-lg font-black">完整业务路径</h1></div>
            <span className="rounded-full bg-[#e1f2ea] px-2.5 py-1 text-[10px] font-bold text-[#267054]">{step + 1}/10</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#748078]">护理方式会随病程变化，不是选一次就锁定；切换后历史档案继续保留。</p>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {flowSteps.map(({ title, detail, icon: Icon }, index) => {
              const active = index === step;
              const reached = index <= furthest;
              return <button key={title} onClick={() => reached && goTo(index)} disabled={!reached} className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left ${active ? 'bg-[#1f8061] text-white shadow-[0_9px_22px_rgba(31,128,97,.18)]' : reached ? 'bg-white text-[#354f44]' : 'bg-[#f4f1eb] text-[#9a9c98]'}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-white/16' : reached ? 'bg-[#e8f4ee] text-[#277358]' : 'bg-white'}`}><Icon size={17}/></span>
                <span className="min-w-0"><b className="block text-xs">{title}</b><small className={`mt-0.5 block text-[9px] ${active ? 'text-white/70' : 'text-current opacity-65'}`}>{detail}</small></span>
              </button>;
            })}
          </div>
          <button onClick={restart} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8e2dc] bg-white text-xs font-bold text-[#537064]"><RefreshCcw size={14}/>重新体验</button>
        </aside>

        <section className={`relative order-1 mx-auto min-h-[720px] w-full max-w-[430px] overflow-hidden rounded-[32px] border shadow-[0_28px_70px_rgba(53,70,59,.18)] lg:order-2 ${isDoctorView ? 'border-[#cbdde9] bg-[#f3f8fb]' : 'border-[#d6e4dc] bg-[#f8fbf8]'}`}>
          <MobileHeader doctor={isDoctorView} petName={petName}/>
          {step >= 3 && carePath && <CareModeStatus carePath={carePath} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} onChange={() => goTo(2)}/>}
          <div className="min-h-[582px] px-3 pb-5 pt-3">
            {step === 0 && <LoginStep onNext={() => goTo(1)}/>}
            {step === 1 && <ProfileStep petName={petName} setPetName={setPetName} species={species} setSpecies={setSpecies} onNext={() => goTo(2)}/>}
            {step === 2 && <PathChoiceStep petName={petName} currentPath={carePath} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} onChoose={chooseCareMode}/>}
            {step === 3 && (carePath === 'hospital' ? <SignedPlanStep petName={petName} authorized={hospitalAuthorized} hospitalName={selectedHospital} onSelectHospital={setSelectedHospital} onAuthorize={() => setHospitalAuthorized(true)} onManageHospitals={() => setHospitalAuthorized(false)} onNext={() => goTo(4)}/> : <HomeCareBasisStep petName={petName} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} onNext={() => goTo(4)}/>)}
            {step === 4 && <TasksStep carePath={carePath} tasks={tasks} setTasks={setTasks} completeCount={completeCount} onNext={() => goTo(5)}/>}
            {step === 5 && <RecordStep appetite={appetite} spirit={spirit} urination={urination} setAppetite={setAppetite} setSpirit={setSpirit} setUrination={setUrination} onNext={() => goTo(6)}/>}
            {step === 6 && <SavedFeedbackStep carePath={carePath} hospitalAuthorized={hospitalAuthorized} petName={petName} risk={risk} onNext={() => goTo(7)}/>}
            {step === 7 && (carePath === 'hospital' ? <DoctorQueueStep petName={petName} risk={risk} hospitalName={selectedHospital} onNext={() => goTo(8)}/> : <HomeRiskRoutingStep petName={petName} risk={risk} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} onNext={() => goTo(8)} onSwitchToHospital={() => chooseCareMode('hospital')}/>)}
            {step === 8 && (carePath === 'hospital' ? <PlanUpdateStep petName={petName} onNext={() => goTo(9)}/> : <HomeAdviceUpdateStep petName={petName} onNext={() => goTo(9)}/>)}
            {step === 9 && (carePath === 'hospital' ? <OutcomeStep petName={petName} hospitalName={selectedHospital} onSwitchHome={() => chooseCareMode('home')} onRestart={restart}/> : <HomeOutcomeStep petName={petName} risk={risk} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} onSwitchHospital={() => chooseCareMode('hospital')} onRestart={restart}/>)}
          </div>
          <MobileNav step={step} furthest={furthest} goTo={goTo} onAi={() => setShowAi(true)} onArchive={() => setShowArchive(true)} doctor={isDoctorView}/>
          {showAi && <AiSheet carePath={carePath} petName={petName} onClose={() => setShowAi(false)}/>}
          {showArchive && <ArchiveSheet carePath={carePath} petName={petName} furthest={furthest} hospitalAuthorized={hospitalAuthorized} hospitalName={selectedHospital} careHistory={careHistory} onClose={() => setShowArchive(false)}/>}
        </section>

        <aside className="order-3 space-y-4 lg:sticky lg:top-24">
          <section className="rounded-[24px] border border-[#e3d8c9] bg-[#fffaf3] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.18em] text-[#9a7040]">SYSTEM FEEDBACK</p><h2 className="mt-2 text-lg font-black">这一步必须让用户知道</h2></div><span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${isDoctorView ? 'bg-[#e4f0f8] text-[#3478a5]' : 'bg-[#e4f3eb] text-[#237357]'}`}><CurrentStepIcon size={19}/></span></div>
            <ul className="mt-4 space-y-3">
              {currentFeedback.map(item => <li key={item} className="flex gap-2.5 text-xs leading-5 text-[#5e7168]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#2d8060]"/>{item}</li>)}
            </ul>
          </section>
          <section className="rounded-[24px] border border-[#d8e4ec] bg-[#f5faff] p-5">
            <div className="flex items-center gap-2 font-black text-[#285f83]"><ShieldCheck size={18}/>医疗边界始终有效</div>
            <p className="mt-3 text-xs leading-6 text-[#607684]">医生负责诊疗和签署方案；AI管家只解释、拆分、提醒、整理趋势和发现风险，不诊断、不改药。</p>
          </section>
          <section className="rounded-[24px] border border-[#e5ded2] bg-white p-5">
            <h2 className="font-black">继续看真实系统</h2>
            <div className="mt-3 grid gap-2">
              <a href="index.html" className="flex min-h-11 items-center justify-between rounded-xl bg-[#e8f4ee] px-4 text-xs font-bold text-[#236b50]">宠主端现有功能<ChevronRight size={16}/></a>
              <a href="hospital.html" className="flex min-h-11 items-center justify-between rounded-xl bg-[#eaf3f9] px-4 text-xs font-bold text-[#356f95]">医生端现有功能<ChevronRight size={16}/></a>
              <a href="admin/index.html" className="flex min-h-11 items-center justify-between rounded-xl bg-[#f2edf7] px-4 text-xs font-bold text-[#715594]">管理后台<ChevronRight size={16}/></a>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function MobileHeader({ doctor, petName }: { doctor: boolean; petName: string }) {
  return <header className={`flex min-h-[64px] items-center justify-between border-b px-4 ${doctor ? 'border-[#d9e6ee] bg-white/92 text-[#245d80]' : 'border-[#dce8e1] bg-[#fffdf8]/94 text-[#195640]'}`}>
    <div className="flex items-center gap-2.5"><span className={`grid size-10 place-items-center rounded-[14px] text-white ${doctor ? 'bg-[#3478a5]' : 'bg-[#1f8061]'}`}>{doctor ? <Stethoscope size={20}/> : <PawPrint size={20}/>}</span><span><b className="block text-sm">宠馨智</b><small className="text-[9px] text-[#73827a]">{doctor ? '医生工作台 · 体验' : `${petName || '未命名宠物'} · 院后护理`}</small></span></div>
    <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${doctor ? 'bg-[#e6f1f8] text-[#34749c]' : 'bg-[#e4f3eb] text-[#247256]'}`}>{doctor ? '医院端' : '宠主端'}</span>
  </header>;
}

function CareModeStatus({ carePath, hospitalAuthorized, hospitalName, onChange }: { carePath: Exclude<CarePath, null>; hospitalAuthorized: boolean; hospitalName: string; onChange: () => void }) {
  const hospitalMode = carePath === 'hospital';
  return <div className={`mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${hospitalMode ? 'border-[#caddea] bg-[#eef6fb]' : 'border-[#cfe2d8] bg-[#eef8f2]'}`}>
    <div className="min-w-0"><small className="block text-[8px] font-black tracking-[.12em] text-[#718078]">当前护理方式 · 可随时更改</small><b className={`mt-0.5 block truncate text-[11px] ${hospitalMode ? 'text-[#326f96]' : 'text-[#236e52]'}`}>{hospitalMode ? `医院协同居家护理 · ${hospitalName}` : '居家自主管理'} </b><span className="mt-0.5 block truncate text-[8px] text-[#78857f]">{hospitalAuthorized ? `已授权：${hospitalName}` : '当前没有医院数据授权'}</span></div>
    <button onClick={onChange} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[10px] font-black text-[#456b5c]"><RefreshCcw size={13}/>更改</button>
  </div>;
}

function StepHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="px-1 pb-3"><p className="text-[9px] font-black tracking-[.16em] text-[#8d795c]">{eyebrow}</p><h2 className="mt-1 text-[22px] font-black tracking-tight text-[#203b30]">{title}</h2><p className="mt-2 text-[11px] leading-5 text-[#708078]">{detail}</p></div>;
}

function PrimaryButton({ children, onClick, disabled = false, tone = 'green' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: 'green' | 'blue' }) {
  return <button onClick={onClick} disabled={disabled} className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#b9c5bf] ${tone === 'blue' ? 'bg-[#3478a5]' : 'bg-[#1f8061]'}`}>{children}<ArrowRight size={17}/></button>;
}

function LoginStep({ onNext }: { onNext: () => void }) {
  return <div className="flex min-h-[550px] flex-col justify-between">
    <div><StepHeading eyebrow="WELCOME" title="让院后的每一天，都有清楚的下一步" detail="先完成微信登录。正式版本会由服务器判断宠主或医生角色。"/>
      <section className="mt-4 overflow-hidden rounded-[26px] border border-[#d6e8df] bg-[linear-gradient(145deg,#e8f7ef,#fff7e9)] p-5">
        <span className="grid size-16 place-items-center rounded-[22px] bg-white text-[#1f8061] shadow-sm"><HeartPulse size={30}/></span>
        <h3 className="mt-5 text-xl font-black">宠物慢性病院后护理</h3>
        <p className="mt-2 text-xs leading-6 text-[#66796f]">可以先居家管理、需要时授权医院，也可以出院后继续医院协同，再随时切换回自主护理。档案始终跟随宠物连续保存。</p>
      </section>
    </div>
    <div><PrimaryButton onClick={onNext}>微信登录并开始体验</PrimaryButton><p className="mt-3 text-center text-[9px] leading-4 text-[#87918c]">体验版不会调用微信账号，也不会上传真实医疗资料</p></div>
  </div>;
}

function ProfileStep({ petName, setPetName, species, setSpecies, onNext }: { petName: string; setPetName: (value: string) => void; species: '猫' | '犬'; setSpecies: (value: '猫' | '犬') => void; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 1 · PET PROFILE" title="先建立这只宠物的健康档案" detail="只填写当前护理真正需要的资料，其他内容以后再补。"/>
    <section className="rounded-[24px] border border-[#dce8e1] bg-white p-4 shadow-[0_10px_30px_rgba(47,83,64,.06)]">
      <label className="block text-xs font-black">宠物昵称</label><input value={petName} onChange={event => setPetName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#dbe6e0] bg-[#fbfdfc] px-4 text-sm outline-none focus:border-[#2a7b5d]" placeholder="请输入宠物昵称"/>
      <div className="mt-5"><span className="text-xs font-black">宠物类型</span><div className="mt-2 grid grid-cols-2 gap-2">{(['猫', '犬'] as const).map(item => <button key={item} onClick={() => setSpecies(item)} className={`min-h-12 rounded-xl border text-sm font-bold ${species === item ? 'border-[#1f8061] bg-[#e4f3eb] text-[#1f6b50]' : 'border-[#e1e6e3] bg-white text-[#718079]'}`}>{item}</button>)}</div></div>
      <div className="mt-5 grid gap-3 rounded-2xl bg-[#fff7e9] p-4 text-xs"><div className="flex justify-between"><span className="text-[#7b7468]">已确诊疾病</span><b>慢性肾病 CKD</b></div><div className="flex justify-between"><span className="text-[#7b7468]">当前阶段</span><b>由医生确认后显示</b></div></div>
    </section>
    <PrimaryButton onClick={onNext} disabled={!petName.trim()}>保存档案</PrimaryButton>
  </div>;
}

function PathChoiceStep({ petName, currentPath, hospitalAuthorized, hospitalName, onChoose }: { petName: string; currentPath: CarePath; hospitalAuthorized: boolean; hospitalName: string; onChoose: (path: Exclude<CarePath, null>) => void }) {
  return <div><StepHeading eyebrow="STEP 2 · CHOOSE CURRENT MODE" title="选择现在最适合的护理方式" detail="这不是一次性分流。可以先居家、后就医，也可以出院后继续医院协同，再切回自主护理。每次切换都保留历史档案。"/>
    <div className="grid gap-3">
      <button onClick={() => onChoose('home')} className={`min-h-[168px] rounded-[24px] border p-4 text-left shadow-[0_10px_26px_rgba(47,83,64,.06)] ${currentPath === 'home' ? 'border-[#71ad91] bg-[linear-gradient(145deg,#dcf2e6,#fffaf1)] ring-2 ring-[#b9ddcb]' : 'border-[#cfe2d8] bg-[linear-gradient(145deg,#eaf7f0,#fffaf1)]'}`}>
        <div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white text-[#267155]"><Home/></span><span className="rounded-full bg-[#dff1e7] px-2.5 py-1 text-[9px] font-black text-[#257054]">{currentPath === 'home' ? '当前使用' : '无需绑定医院'}</span></div>
        <b className="mt-4 block text-base">居家自主管理</b><p className="mt-1 text-[10px] leading-5 text-[#60756a]">AI管家根据已审核知识库和 {petName} 的真实记录，生成非药物护理建议、观察任务与就医提醒。</p>
      </button>
      <button onClick={() => onChoose('hospital')} className={`min-h-[168px] rounded-[24px] border p-4 text-left shadow-[0_10px_26px_rgba(47,83,64,.05)] ${currentPath === 'hospital' ? 'border-[#79a9c7] bg-[linear-gradient(145deg,#e1f1fa,#fff)] ring-2 ring-[#c4ddeb]' : 'border-[#d5e3ec] bg-[linear-gradient(145deg,#edf6fb,#fff)]'}`}>
        <div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white text-[#3478a5]"><Building2/></span><span className="rounded-full bg-[#e4f0f8] px-2.5 py-1 text-[9px] font-black text-[#34749c]">{currentPath === 'hospital' ? '当前使用' : hospitalAuthorized ? '已有医院授权' : '可选医院'}</span></div>
        <b className="mt-4 block text-base">医院协同居家护理</b><p className="mt-1 text-[10px] leading-5 text-[#617585]">医生负责诊疗和签署方案；平台把有效方案转成每日居家任务，整理反馈并回传风险。</p>
      </button>
    </div>
    <p className="mt-3 rounded-xl bg-[#fff5e5] p-3 text-[9px] leading-5 text-[#7b6748]">{hospitalAuthorized ? `当前已授权 ${hospitalName}。选择居家自主管理不会删除授权或历史记录，但不会自动把每条居家记录推送给医院。` : '没有医院授权也能完整使用；以后授权医院时，只有获得授权的医院能查看相应资料。'} 居家建议不提供诊断、处方或药物剂量。</p>
  </div>;
}

function HomeCareBasisStep({ petName, hospitalAuthorized, hospitalName, onNext }: { petName: string; hospitalAuthorized: boolean; hospitalName: string; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 3 · HOME CARE BASIS" title="先建立安全的居家护理建议" detail="AI管家结合已确诊信息、当前记录和已审核知识条目给出建议；资料不足时先追问。"/>
    <section className="overflow-hidden rounded-[24px] border border-[#cfe2d8] bg-white">
      <div className="flex items-center justify-between bg-[#eaf7f0] p-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white text-[#267155]"><Bot/></span><div><b className="block text-sm">居家护理建议清单</b><small className="text-[9px] text-[#667b70]">知识库辅助 · 体验内容</small></div></div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#277155]">v1.0</span></div>
      <div className="grid gap-3 p-4 text-xs"><PlanRow label="适用宠物" value={`${petName} · 已确诊CKD`}/><PlanRow label="建议依据" value="档案、家庭观察、已审核护理知识"/><PlanRow label="今日重点" value="饮食执行、饮水变化、食欲、精神、排尿与呕吐"/><PlanRow label="风险规则" value="比较自身7/14/30天趋势并识别连续变化"/><PlanRow label="需要医院" value="持续恶化、急症红旗或资料不足无法判断"/></div>
    </section>
    <PrimaryButton onClick={onNext}>生成今日居家护理任务</PrimaryButton>
    <p className="mt-3 rounded-xl bg-[#edf5fb] p-3 text-[9px] leading-5 text-[#547184]"><b>AI管家边界：</b>不诊断、不改药、不生成处方剂量；已经使用的药物仍按原兽医医嘱执行。{hospitalAuthorized ? ` ${hospitalName} 的授权仍保留，但当前是自主护理模式，不自动进入医生队列。` : ''}</p>
  </div>;
}

function SignedPlanStep({ petName, authorized, hospitalName, onSelectHospital, onAuthorize, onManageHospitals, onNext }: { petName: string; authorized: boolean; hospitalName: string; onSelectHospital: (hospital: (typeof demoHospitals)[number]) => void; onAuthorize: () => void; onManageHospitals: () => void; onNext: () => void }) {
  if (!authorized) return <div><StepHeading eyebrow="STEP 3 · HOSPITAL AUTHORIZATION" title="选择并授权你信任的医院" detail="可以授权原就诊医院，也可以换一家医院。只有宠主主动授权、且通过平台审核的医生，才能查看这只宠物的病例。"/>
    <section className="rounded-[24px] border border-[#d5e3ec] bg-white p-4">
      <div className="space-y-2">{demoHospitals.map(hospital => <button key={hospital} onClick={() => onSelectHospital(hospital)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-left ${hospitalName === hospital ? 'border-[#78a8c5] bg-[#edf6fb] ring-1 ring-[#c5dce9]' : 'border-[#e0e7eb] bg-white'}`}><span className="grid size-10 place-items-center rounded-xl bg-white text-[#3478a5]"><Building2 size={19}/></span><span className="flex-1"><b className="block text-xs">{hospital}</b><small className="mt-0.5 block text-[8px] text-[#70808a]">体验医院 · 不代表真实合作机构</small></span>{hospitalName === hospital && <CheckCircle2 size={17} className="text-[#3478a5]"/>}</button>)}</div>
      <div className="mt-4 rounded-2xl bg-[#f4f8fb] p-4 text-[10px] leading-5 text-[#607684]"><b>授权范围：</b>允许本院已审核医生查看 {petName} 的档案、护理执行、健康记录和已上传报告。其他医院不能查看；换医院时必须重新授权。</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px]"><span className="rounded-xl bg-[#edf5fb] p-2">肾病能力</span><span className="rounded-xl bg-[#edf5fb] p-2">距离与营业</span><span className="rounded-xl bg-[#edf5fb] p-2">可预约情况</span></div>
    </section>
    <PrimaryButton onClick={onAuthorize} tone="blue">授权 {hospitalName} 并查看方案</PrimaryButton>
  </div>;
  return <div><StepHeading eyebrow="STEP 3 · DOCTOR SIGNED" title="护理方案来自主治医生" detail="AI管家只能解释和拆分已经签署的方案，不能自行生成治疗决定。"/>
    <section className="overflow-hidden rounded-[24px] border border-[#ecd9ba] bg-white">
      <div className="flex items-center justify-between bg-[#fff4df] p-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white text-[#c17b2d]"><FileSignature/></span><div><b className="block text-sm">院后护理方案</b><small className="text-[9px] text-[#7d6d57]">已签署 · 当前执行中</small></div></div><span className="rounded-full bg-[#e5f3eb] px-2.5 py-1 text-[9px] font-black text-[#287256]">v1.0</span></div>
      <div className="grid gap-3 p-4 text-xs">
        <PlanRow label="适用宠物" value={`${petName} · 猫CKD`}/><PlanRow label="制定者" value="示例主治医生（体验）"/><PlanRow label="所属机构" value={hospitalName}/><PlanRow label="开始日期" value="2026-09-28"/><PlanRow label="复查日期" value="2026-10-28"/><PlanRow label="必须联系医生" value="连续变化、漏执行或出现医生设定风险"/>
      </div>
    </section>
    <PrimaryButton onClick={onNext}>由AI管家拆成今日任务</PrimaryButton>
    <button onClick={onManageHospitals} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cddde7] bg-white text-[10px] font-black text-[#3d7192]"><RefreshCcw size={14}/>更换或重新授权其他医院</button>
    <p className="mt-3 rounded-xl bg-[#edf5fb] p-3 text-[9px] leading-5 text-[#547184]"><b>AI管家边界：</b>不诊断、不改药，任务草稿必须经过医生确认才可发布。</p>
  </div>;
}

function PlanRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-[#edf0ee] pb-2 last:border-0 last:pb-0"><span className="shrink-0 text-[#7b8780]">{label}</span><b className="text-right leading-5">{value}</b></div>; }

function TasksStep({ carePath, tasks, setTasks, completeCount, onNext }: { carePath: CarePath; tasks: Record<TaskKey, boolean>; setTasks: React.Dispatch<React.SetStateAction<Record<TaskKey, boolean>>>; completeCount: number; onNext: () => void }) {
  const definitions = carePath === 'hospital' ? taskDefinitions : homeTaskDefinitions;
  return <div><StepHeading eyebrow="STEP 4 · TODAY CARE" title="今天只看需要完成的护理" detail={carePath === 'hospital' ? '平台依据医生当前有效方案生成居家执行任务；当天没有记录也不会让基础方案消失。' : '居家建议始终可查看；当天漏记会标为数据缺失，但不会阻止继续护理。'}/>
    <section className="overflow-hidden rounded-[24px] border border-[#dce8e1] bg-white">
      <div className="flex items-center justify-between bg-[#edf8f2] p-4"><div><b className="block text-sm">今日护理进度</b><small className="text-[9px] text-[#6b7c73]">点击每一项完成真实交互</small></div><strong className="text-2xl text-[#1f8061]">{completeCount}/3</strong></div>
      {definitions.map(task => <button key={task.key} onClick={() => setTasks(current => ({ ...current, [task.key]: !current[task.key] }))} className="flex min-h-[74px] w-full items-center gap-3 border-t border-[#edf1ef] bg-white px-4 text-left">
        <time className="w-11 shrink-0 text-[11px] font-black text-[#4e6d5e]">{task.time}</time><span className="min-w-0 flex-1"><b className="block text-xs">{task.title}</b><small className="mt-1 block text-[9px] leading-4 text-[#7a8881]">{task.detail}</small></span><span className={`grid size-8 shrink-0 place-items-center rounded-full border ${tasks[task.key] ? 'border-[#1f8061] bg-[#1f8061] text-white' : 'border-[#cdd9d3] bg-white text-transparent'}`}><Check size={16}/></span>
      </button>)}
    </section>
    <PrimaryButton onClick={onNext} disabled={completeCount < 3}>完成护理，记录今日状态</PrimaryButton>
    {completeCount < 3 && <p className="mt-2 text-center text-[9px] text-[#8b7760]">请先完成3项体验任务</p>}
  </div>;
}

function RecordStep({ appetite, spirit, urination, setAppetite, setSpirit, setUrination, onNext }: { appetite: RecordChoice; spirit: RecordChoice; urination: RecordChoice; setAppetite: (value: RecordChoice) => void; setSpirit: (value: RecordChoice) => void; setUrination: (value: RecordChoice) => void; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 5 · BASIC MODE" title="没有设备，也能完成健康记录" detail="基础观察优先；体重、饮水毫升、血糖和血压等数据按家庭条件选填。"/>
    <section className="space-y-3 rounded-[24px] border border-[#dce8e1] bg-white p-4">
      <ChoiceRow title="食欲" value={appetite} onChange={setAppetite}/><ChoiceRow title="精神状态" value={spirit} onChange={setSpirit}/><ChoiceRow title="排尿变化" value={urination} onChange={setUrination}/>
      <div className="rounded-2xl bg-[#f7f3ec] p-3 text-[10px] leading-5 text-[#716c63]">普通设备和专业设备数据在二级入口按需填写，不会阻挡基础记录提交。</div>
    </section>
    <PrimaryButton onClick={onNext}>保存并生成今日变化</PrimaryButton>
  </div>;
}

function ChoiceRow({ title, value, onChange }: { title: string; value: RecordChoice; onChange: (value: RecordChoice) => void }) {
  return <div><b className="text-xs">{title}</b><div className="mt-2 grid grid-cols-3 gap-2">{(['正常', '一般', '下降'] as const).map(item => <button key={item} onClick={() => onChange(item)} className={`min-h-11 rounded-xl text-[11px] font-bold ${value === item ? item === '下降' ? 'bg-[#fff0ed] text-[#b35148] ring-1 ring-[#e4b8b2]' : 'bg-[#e6f3eb] text-[#267055] ring-1 ring-[#bcdccc]' : 'bg-[#f2f4f3] text-[#77827d]'}`}>{item}</button>)}</div></div>;
}

function SavedFeedbackStep({ carePath, hospitalAuthorized, petName, risk, onNext }: { carePath: CarePath; hospitalAuthorized: boolean; petName: string; risk: boolean; onNext: () => void }) {
  const hospital = carePath === 'hospital';
  return <div><StepHeading eyebrow="STEP 6 · SAVED" title="记录保存后，马上告诉用户发生了什么" detail="不能只显示“保存成功”，必须把变化、风险和后续处理说清楚。"/>
    <section className="rounded-[24px] border border-[#cfe2d8] bg-white p-4 shadow-[0_10px_30px_rgba(47,83,64,.06)]">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-[#e3f3ea] text-[#247155]"><CheckCircle2/></span><div><b className="block text-base">已保存至长期健康档案</b><small className="text-[9px] text-[#74827b]">档案编号 CXZ-DEMO-0928-001</small></div></div>
      <div className="mt-4 grid gap-2 text-xs"><FeedbackRow label="与上一次相比" value={risk ? '食欲或状态出现下降' : '未发现明显变化'} tone={risk ? 'amber' : 'green'}/><FeedbackRow label="今天需要" value={risk ? (hospital ? '继续观察，等待医生审核' : '加强观察并查看就医建议') : '按当前护理安排继续'} tone={risk ? 'amber' : 'green'}/><FeedbackRow label={hospital ? '医生通知' : 'AI分析'} value={hospital ? (risk ? '已进入当前协同医院队列' : '未触发主动通知') : hospitalAuthorized ? '已完成；当前未自动推送给已授权医院' : '已完成，仅作护理辅助'} tone={risk ? 'blue' : 'green'}/><FeedbackRow label="下一步" value={hospital ? (risk ? '体验规则：2小时内处理' : '无需医生立即处理') : (risk ? '继续居家或切换医院协同' : '明日继续记录变化')} tone="blue"/></div>
    </section>
    <PrimaryButton onClick={onNext}>{hospital ? '切换到医生端查看回传' : '查看风险分流与医院选择'}</PrimaryButton>
  </div>;
}

function FeedbackRow({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'blue' }) {
  const color = tone === 'amber' ? 'bg-[#fff5e4] text-[#9b6a28]' : tone === 'blue' ? 'bg-[#edf5fb] text-[#3c7192]' : 'bg-[#edf7f2] text-[#2c7358]';
  return <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${color}`}><span>{label}</span><b className="text-right">{value}</b></div>;
}

function DoctorQueueStep({ petName, risk, hospitalName, onNext }: { petName: string; risk: boolean; hospitalName: string; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 7 · DOCTOR QUEUE" title="医生先处理风险，不被全部数据淹没" detail={`${hospitalName} 只接收宠主已授权、且当前处于医院协同方式的病例；医生仍能查看原始记录。`}/>
    <section className="rounded-[24px] border border-[#d5e3ec] bg-white p-4">
      <div className="grid grid-cols-3 gap-2"><RiskTile value="0" label="紧急" tone="red"/><RiskTile value={risk ? '1' : '0'} label="待处理" tone="amber"/><RiskTile value={risk ? '0' : '1'} label="稳定" tone="green"/></div>
      <button className="mt-4 flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-[#ead9bc] bg-[#fff8eb] p-3 text-left"><span className="grid size-11 place-items-center rounded-full bg-white text-[#b67629]"><PawPrint size={20}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{petName} · CKD院后护理</b><small className="mt-1 block text-[9px] leading-4 text-[#786b5a]">原始记录：食欲下降／精神一般 · 18:46提交</small></span><ChevronRight size={17}/></button>
      <div className="mt-3 rounded-2xl bg-[#eef5fa] p-3 text-[10px] leading-5 text-[#587184]"><b>AI摘要：</b>仅整理“连续变化、漏执行与风险”，不修改疾病分期，不给出药物调整。</div>
    </section>
    <PrimaryButton onClick={onNext} tone="blue">医生审核并更新护理方案</PrimaryButton>
  </div>;
}

function HomeRiskRoutingStep({ petName, risk, hospitalAuthorized, hospitalName, onNext, onSwitchToHospital }: { petName: string; risk: boolean; hospitalAuthorized: boolean; hospitalName: string; onNext: () => void; onSwitchToHospital: () => void }) {
  return <div><StepHeading eyebrow="STEP 7 · HOME RISK ROUTING" title="AI说明风险，决定权留给宠主" detail={hospitalAuthorized ? `当前是居家自主管理；即使已授权 ${hospitalName}，也不会假装医生已经处理。宠主可以继续居家或切换回医院协同。` : '没有绑定医院时，系统不会假装已经通知医生；它会解释变化、提示优先级，并提供选择医院的入口。'}/>
    <section className="rounded-[24px] border border-[#d9e6df] bg-white p-4">
      <div className={`rounded-2xl p-4 ${risk ? 'bg-[#fff5e4] text-[#8d6229]' : 'bg-[#eaf6ef] text-[#2f765a]'}`}><div className="flex items-center gap-2 font-black"><AlertTriangle size={18}/>{risk ? '发现需要关注的变化' : '当前记录相对稳定'}</div><p className="mt-2 text-[10px] leading-5">{risk ? `${petName} 的食欲或状态出现下降。单次记录不能诊断疾病阶段，建议继续观察；若持续或出现急症红旗，应尽快就医。` : '继续按当前居家护理建议执行，并保持连续记录。'}</p></div>
      <div className="mt-3 grid gap-2">
        <button onClick={onNext} className="flex min-h-14 items-center justify-between rounded-2xl border border-[#cfe2d8] bg-[#f4faf7] px-4 text-left"><span><b className="block text-xs">继续居家记录</b><small className="mt-1 block text-[9px] text-[#6c7d74]">适用于无紧急红旗、愿意持续观察的情况</small></span><ChevronRight size={16}/></button>
        <button onClick={onSwitchToHospital} className="flex min-h-14 items-center justify-between rounded-2xl border border-[#d4e2ec] bg-[#f3f8fc] px-4 text-left"><span><b className="block text-xs">{hospitalAuthorized ? `切换为 ${hospitalName} 协同` : '选择并授权适合的医院'}</b><small className="mt-1 block text-[9px] text-[#687b89]">{hospitalAuthorized ? '已有授权直接进入医生方案；历史居家记录继续保留' : '正式版按专科能力、距离、营业状态和可预约情况筛选'}</small></span><ChevronRight size={16}/></button>
      </div>
      <div className="mt-3 rounded-2xl bg-[#fff0ed] p-3 text-[10px] leading-5 text-[#9a514a]"><b>急症优先：</b>呼吸困难、意识异常、持续抽搐、无法排尿等情况不等待AI分析，立即联系急诊医院。</div>
    </section>
    <PrimaryButton onClick={onNext}>暂不绑定医院，更新居家建议</PrimaryButton>
  </div>;
}

function RiskTile({ value, label, tone }: { value: string; label: string; tone: 'red' | 'amber' | 'green' }) {
  const color = tone === 'red' ? 'bg-[#fff0ed] text-[#b65349]' : tone === 'amber' ? 'bg-[#fff5e3] text-[#a56b23]' : 'bg-[#eaf6ef] text-[#2f785b]';
  return <div className={`rounded-2xl p-3 ${color}`}><strong className="text-2xl">{value}</strong><small className="mt-1 block text-[9px] font-bold">{label}</small></div>;
}

function PlanUpdateStep({ petName, onNext }: { petName: string; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 8 · VERSIONED PLAN" title="医生修改，AI再拆任务" detail="每次调整都有版本、修改人和原因；宠主次日看到新的任务清单。"/>
    <section className="overflow-hidden rounded-[24px] border border-[#d4e2eb] bg-white">
      <div className="flex items-center justify-between bg-[#eaf3f9] p-4"><div><b className="block text-sm">{petName} 护理方案</b><small className="text-[9px] text-[#697e8b]">主治医生审核结果</small></div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#37759b]">v1.1 草稿</span></div>
      <div className="space-y-3 p-4 text-xs"><PlanRow label="修改人" value="示例医生（体验）"/><PlanRow label="修改原因" value="家庭记录出现变化，增加观察频率"/><PlanRow label="次日变化" value="保留原护理任务，增加一次状态观察"/><PlanRow label="AI权限" value="只拆分任务和提醒，不改药"/></div>
      <div className="border-t border-[#e7edf1] bg-[#fafcfd] p-4 text-[10px] leading-5 text-[#637784]">医生签署发布后，v1.1 才会替代 v1.0 对宠主生效；历史版本继续留痕。</div>
    </section>
    <PrimaryButton onClick={onNext} tone="blue">签署发布并查看复诊验证</PrimaryButton>
  </div>;
}

function HomeAdviceUpdateStep({ petName, onNext }: { petName: string; onNext: () => void }) {
  return <div><StepHeading eyebrow="STEP 8 · HOME ADVICE UPDATE" title="AI只更新护理建议，不越权改治疗" detail="系统根据今天的变化提高观察频率，并把就医条件说清楚；药物和疾病分期仍交给兽医。"/>
    <section className="overflow-hidden rounded-[24px] border border-[#cfe2d8] bg-white">
      <div className="flex items-center justify-between bg-[#eaf7f0] p-4"><div><b className="block text-sm">{petName} 居家建议</b><small className="text-[9px] text-[#667b70]">AI管家趋势反馈</small></div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#277155]">v1.1 建议</span></div>
      <div className="space-y-3 p-4 text-xs"><PlanRow label="更新原因" value="今日食欲或状态较自身基线下降"/><PlanRow label="明日任务" value="原任务保留，增加早晚各一次基础观察"/><PlanRow label="重点记录" value="食欲、精神、饮水变化、排尿、呕吐"/><PlanRow label="不得执行" value="不得依据AI自行加药、停药或改变剂量"/><PlanRow label="转医院条件" value="持续恶化、急症红旗或关键资料不足"/></div>
      <div className="border-t border-[#e7eee9] bg-[#fafcfb] p-4 text-[10px] leading-5 text-[#61746a]">知识库建议会显示适用对象、前提和来源；找不到足够依据时必须明确提示“当前无法判断”。</div>
    </section>
    <PrimaryButton onClick={onNext}>保存建议并查看趋势复核</PrimaryButton>
  </div>;
}

function OutcomeStep({ petName, hospitalName, onSwitchHome, onRestart }: { petName: string; hospitalName: string; onSwitchHome: () => void; onRestart: () => void }) {
  return <div><StepHeading eyebrow="STEP 9 · FOLLOW-UP" title="复诊后仍可选择下一阶段护理方式" detail={`系统把方案执行、家庭趋势和复诊指标提供给 ${hospitalName}，由医生作临床判断；出院后可继续协同，也可切回居家自主管理。`}/>
    <section className="rounded-[24px] border border-[#dce8e1] bg-white p-4">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#e8f4ee] text-[#287559]"><CalendarCheck2/></span><div><b className="block text-sm">{petName} · 本轮护理总结</b><small className="text-[9px] text-[#728078]">体验数据 · 不构成临床结论</small></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><OutcomeMetric label="任务完成率" value="100%"/><OutcomeMetric label="记录天数" value="1天"/><OutcomeMetric label="异常处理" value="已审核"/><OutcomeMetric label="方案版本" value="v1.1"/></div>
      <div className="mt-3 rounded-2xl bg-[#fff6e8] p-3 text-[10px] leading-5 text-[#79633f]"><b>下一步：</b>上传真实复诊报告后，由主治医生判断继续、调整或终止方案。系统不会自动宣称“治愈”。</div>
    </section>
    <button onClick={onSwitchHome} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1f8061] text-sm font-black text-white"><Home size={16}/>出院后切换为居家自主管理</button>
    <button onClick={onRestart} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d3e0d9] bg-white text-[10px] font-black text-[#527064]"><RefreshCcw size={14}/>重新体验全部流程</button>
    <a href="portal.html" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7e2dc] bg-white text-xs font-bold text-[#527064]"><ArrowLeft size={15}/>返回系统总入口</a>
  </div>;
}

function HomeOutcomeStep({ petName, risk, hospitalAuthorized, hospitalName, onSwitchHospital, onRestart }: { petName: string; risk: boolean; hospitalAuthorized: boolean; hospitalName: string; onSwitchHospital: () => void; onRestart: () => void }) {
  return <div><StepHeading eyebrow="STEP 9 · HOME REVIEW" title="居家护理后仍可随时进入医院协同" detail="任务、记录、变化和建议持续进入同一份长期档案；需要诊疗时授权医院，治疗调整仍由兽医决定。"/>
    <section className="rounded-[24px] border border-[#dce8e1] bg-white p-4">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#e8f4ee] text-[#287559]"><ChartNoAxesCombined/></span><div><b className="block text-sm">{petName} · 居家护理总结</b><small className="text-[9px] text-[#728078]">体验数据 · 不构成诊疗结论</small></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><OutcomeMetric label="任务完成率" value="100%"/><OutcomeMetric label="记录天数" value="1天"/><OutcomeMetric label="当前结论" value="证据不足"/><OutcomeMetric label="风险提示" value={risk ? '建议关注' : '继续记录'}/></div>
      <div className="mt-3 rounded-2xl bg-[#fff6e8] p-3 text-[10px] leading-5 text-[#79633f]"><b>下一步：</b>{risk ? '继续记录并根据变化选择合适医院；若出现急症红旗立即就医。' : '继续积累7天、14天和30天记录，再比较自身趋势。'} AI不会根据一天记录判断疾病分期或修改治疗。</div>
    </section>
    <button onClick={onSwitchHospital} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3478a5] text-sm font-black text-white"><Building2 size={16}/>{hospitalAuthorized ? `切换回 ${hospitalName} 协同` : '选择医院并进入协同护理'}</button>
    <button onClick={onRestart} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d3e0d9] bg-white text-[10px] font-black text-[#527064]"><RefreshCcw size={14}/>重新体验全部流程</button>
    <a href="portal.html" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7e2dc] bg-white text-xs font-bold text-[#527064]"><ArrowLeft size={15}/>返回系统总入口</a>
  </div>;
}

function OutcomeMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-[#f3f8f5] p-3"><small className="text-[9px] text-[#74827b]">{label}</small><b className="mt-1 block text-sm">{value}</b></div>; }

function MobileNav({ step, furthest, goTo, onAi, onArchive, doctor }: { step: number; furthest: number; goTo: (step: number) => void; onAi: () => void; onArchive: () => void; doctor: boolean }) {
  if (doctor) return <nav className="grid min-h-[64px] grid-cols-5 border-t border-[#dbe6ed] bg-white px-1 pb-1"><NavButton active={step === 7} label="工作台" icon={Home} onClick={() => goTo(7)}/><NavButton active={step === 7} label="待处理" icon={AlertTriangle} onClick={() => goTo(7)}/><NavButton active={false} label="病例" icon={FolderHeart} onClick={() => goTo(7)}/><NavButton active={step === 8} label="随访" icon={CalendarCheck2} onClick={() => goTo(8)}/><NavButton active={false} label="我的" icon={UserRound} onClick={() => goTo(8)}/></nav>;
  return <nav className="grid min-h-[64px] grid-cols-5 border-t border-[#dce7e1] bg-white px-1 pb-1"><NavButton active={step === 3} label="首页" icon={Home} onClick={() => goTo(furthest >= 3 ? 3 : furthest)}/><NavButton active={step === 4} label="护理" icon={ClipboardCheck} onClick={() => goTo(4)}/><NavButton active={step === 5} label="记录" icon={Activity} onClick={() => goTo(5)}/><NavButton active={false} label="AI管家" icon={Bot} onClick={onAi}/><NavButton active={false} label="档案" icon={NotebookTabs} onClick={onArchive}/></nav>;
}

function NavButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Home; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[9px] ${active ? 'font-black text-[#1f8061]' : 'text-[#76827c]'}`}><Icon size={19}/><span>{label}</span></button>; }

function AiSheet({ carePath, petName, onClose }: { carePath: CarePath; petName: string; onClose: () => void }) { const hospital = carePath === 'hospital'; return <div className="absolute inset-0 z-40 flex items-end bg-[#20352b]/40 p-3"><section className="w-full rounded-[26px] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#eaf3f9] text-[#3478a5]"><Bot/></span><div><b className="block">AI管家</b><small className="text-[9px] text-[#718078]">服务于 {petName} 的护理执行</small></div></div><button onClick={onClose} className="min-h-11 rounded-xl px-3 text-xs font-bold">关闭</button></div><div className="mt-4 rounded-2xl bg-[#f5f8fa] p-4 text-xs leading-6 text-[#546a60]"><b>问题：</b>今天没有记录，会不会无法继续护理？<br/><b>回答：</b>不会。{hospital ? '医生签署的基础方案始终显示' : '已保存的居家护理建议仍可查看'}；缺少记录只会被标为“数据缺失”，不能当作状态正常。</div><p className="mt-3 text-[9px] leading-5 text-[#7b8580]">AI管家不诊断、不改药。知识库回答需要显示适用条件和审核资料来源。</p></section></div>; }

function ArchiveSheet({ carePath, petName, furthest, hospitalAuthorized, hospitalName, careHistory, onClose }: { carePath: CarePath; petName: string; furthest: number; hospitalAuthorized: boolean; hospitalName: string; careHistory: string[]; onClose: () => void }) {
  const hospital = carePath === 'hospital';
  return <div className="absolute inset-0 z-40 flex items-end bg-[#20352b]/40 p-3"><section className="max-h-[82%] w-full overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><b className="block text-base">{petName} 的长期健康档案</b><small className="text-[9px] text-[#718078]">切换护理方式不会删除历史 · 体验数据</small></div><button onClick={onClose} className="min-h-11 rounded-xl px-3 text-xs font-bold">关闭</button></div><div className="mt-4 grid grid-cols-2 gap-2"><OutcomeMetric label="当前方式" value={hospital ? '医院协同' : '居家自主'}/><OutcomeMetric label="医院授权" value={hospitalAuthorized ? hospitalName : '未授权'}/><OutcomeMetric label="今日记录" value={furthest >= 6 ? '1条' : '0条'}/><OutcomeMetric label="方案/建议" value={furthest >= 9 ? 'v1.1' : 'v1.0'}/></div><div className="mt-3 rounded-xl bg-[#f3f8f5] p-3 text-[10px] leading-5 text-[#607269]"><b>护理方式变更留痕</b>{careHistory.length ? careHistory.map(item => <span key={item} className="mt-1 block">{item}</span>) : <span className="mt-1 block">尚未选择护理方式</span>}</div><p className="mt-3 rounded-xl bg-[#edf5fb] p-3 text-[10px] leading-5 text-[#607482]">正式版将保留医院授权、更换、撤销、医生方案版本和7/14/30天趋势；新医院只能在宠主授权后读取指定资料。</p></section></div>;
}
