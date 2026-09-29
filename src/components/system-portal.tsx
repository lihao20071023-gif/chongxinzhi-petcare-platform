import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Code2,
  Database,
  FileCheck2,
  FileSignature,
  HeartHandshake,
  LockKeyhole,
  PawPrint,
  Settings2,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRound,
  PlayCircle,
  Palette,
} from 'lucide-react';

const ownerFeatures = ['首页与宠物档案', '每日护理与打卡', 'AI护理问答', '化验单上传'];
const doctorFeatures = ['本院病例列表', '医嘱与护理方案', '执行情况复核', '复诊提醒'];
const adminFeatures = ['数据看板与用户管理', '医院 / 医生资质审核', '知识库版本管理', 'AI参数与安全边界'];

const architecture = [
  { icon: Smartphone, title: '一个微信小程序', detail: '宠主与医生共用同一份代码，登录后按角色路由', tone: 'bg-[#e2f3ea] text-[#246b50]' },
  { icon: Code2, title: '一个Web管理后台', detail: '仅管理员在电脑端使用，不放进小程序', tone: 'bg-[#eee8f7] text-[#72569a]' },
  { icon: Cloud, title: '一个统一API服务', detail: '认证、业务、AI和管理接口集中维护', tone: 'bg-[#e5eef8] text-[#376e94]' },
  { icon: Database, title: '一套共享数据库', detail: '数据库行级权限隔离宠主、本院医生和管理员', tone: 'bg-[#fff0d9] text-[#96661f]' },
];

const careLoopSteps = [
  {icon:LockKeyhole,title:'1. 选择当前方式',detail:'随病程在居家自主与医院协同间切换'},
  {icon:Bot,title:'2. 建立依据',detail:'医生方案或已审核知识库护理建议'},
  {icon:ClipboardCheck,title:'3. 宠主执行',detail:'用药、饮食、补液、监测统一完成'},
  {icon:Activity,title:'4. 长期存档',detail:'基础/普通/专业三种记录模式'},
  {icon:AlertTriangle,title:'5. 风险分流',detail:'医院回传或给出继续观察与就医选择'},
  {icon:CalendarCheck2,title:'6. 结果复核',detail:'比较长期趋势，治疗调整仍由兽医决定'},
];

export function SystemPortal() {
  return (
    <div className="min-h-screen bg-[#f4f8f6] text-[#20362c]">
      <header className="border-b border-[#deebe4] bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1220px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[#216e50] text-white"><PawPrint size={21}/></span>
            <span><b className="block text-sm">宠馨智</b><small className="text-[11px] text-[#718179]">统一产品架构</small></span>
          </a>
          <div className="flex items-center gap-2"><a href="portal-preserved.html" className="hidden rounded-full border border-[#d9e5df] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5d7368] sm:inline-flex">当前入口保留版</a><span className="rounded-full border border-[#cfe4d9] bg-[#f5fbf8] px-3 py-1.5 text-xs font-bold text-[#2b7054]">1个小程序 · 1个后台 · 1个API · 1套数据库</span></div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-[1220px] px-5 pb-12 pt-14 text-center sm:px-8 sm:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#e5f3eb] px-4 py-2 text-xs font-bold text-[#2b7255]"><HeartHandshake size={15}/>宠物慢性病院后护理协同平台</div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-[-.04em] text-[#173f30] sm:text-6xl">不是三个App，<span className="text-[#2b7858]">是一套按角色工作的系统</span></h1>
          <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-[#65786e] sm:text-base">宠主和医生在同一个微信小程序登录；系统读取服务器角色后自动显示相应页面。管理员只使用电脑Web后台。所有端共用一个API和同一套数据库。</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href="experience.html" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#216e50] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(33,110,80,.20)]"><PlayCircle size={18}/>亲自体验完整护理闭环</a><a href="visual-analysis.html" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#cadbd2] bg-white px-6 text-sm font-bold text-[#276c52]"><Palette size={18}/>查看14张截图视觉分析</a></div>
        </section>

        <section className="mx-auto max-w-[1220px] px-5 pb-14 sm:px-8">
          <div className="grid gap-4 overflow-hidden rounded-[30px] border border-[#d9ddcf] bg-[linear-gradient(135deg,#fff8e9,#e8f6ef)] p-6 shadow-[0_18px_50px_rgba(49,81,63,.08)] md:grid-cols-[1.2fr_.8fr] md:items-center md:p-8">
            <div><span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-[#8d6b34]">NEW · 可点击体验</span><h2 className="mt-4 text-2xl font-black sm:text-3xl">不是固定双路径，而是可切换的连续护理</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#63756c]">可以先居家管理、恶化后授权医院，也可以由医院诊疗后回家继续协同护理，再切换为自主护理。护理方式会变，宠物长期档案不会断。</p></div>
            <a href="experience.html" className="flex min-h-14 items-center justify-between rounded-2xl bg-[#1f8061] px-5 text-sm font-black text-white">体验可切换护理闭环<ArrowRight size={19}/></a>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1220px] gap-4 px-5 pb-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {architecture.map(({icon: Icon,title,detail,tone}) => <article key={title} className="rounded-[24px] border border-[#dfe9e4] bg-white p-5 shadow-[0_12px_38px_rgba(45,78,63,.06)]"><span className={`grid size-11 place-items-center rounded-2xl ${tone}`}><Icon size={21}/></span><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-xs leading-5 text-[#718078]">{detail}</p></article>)}
        </section>

        <section className="mx-auto max-w-[1220px] px-5 pb-16 sm:px-8">
          <div className="mb-7 text-center"><h2 className="text-2xl font-bold sm:text-3xl">真实页面入口</h2><p className="mt-3 text-sm text-[#65786e]">下面预览的是正在运行的代码页面，不是设计图。点击按钮进入后，每个护理任务、记录和审核操作都可以实际使用。</p></div>
          <div className="grid gap-5 lg:grid-cols-3">
            <LivePreview title="宠主端" detail="宠物档案、今日护理、健康记录、AI管家" src="index.html" href="index.html" tone="green"/>
            <LivePreview title="医院／医生端" detail="风险队列、授权病例、医嘱签署、复诊验证" src="hospital.html" href="hospital.html" tone="blue"/>
            <LivePreview title="开发者管理后台" detail="数据、医院审核、知识库和系统规则" src="admin/index.html" href="admin/index.html" tone="purple"/>
          </div>
          <div className="mt-6 text-center"><a href="design.html" className="inline-flex items-center gap-2 rounded-xl border border-[#bfd6ca] bg-white px-5 py-3 text-sm font-bold text-[#216e50]">查看第一版视觉设计依据<ArrowRight size={17}/></a></div>
        </section>

        <section id="care-loop" className="mx-auto max-w-[1220px] px-5 pb-16 sm:px-8">
          <div className="overflow-hidden rounded-[32px] border border-[#c8dfd3] bg-white shadow-[0_24px_65px_rgba(39,88,64,.10)]">
            <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,#e2f3ea,#f8fcfa)] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-9">
              <div><h2 className="text-2xl font-bold sm:text-3xl">医院是可切换的协同方，不是使用门槛</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f756a]">医院诊疗时由医生签署方案，平台转成居家任务；自主护理时由AI管家依据已审核知识库提供非药物护理建议。宠主可以在不同阶段切换、换医院或重新授权，所有变化继续写入同一份档案。</p></div>
              <a href="experience.html" className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#216e50] px-5 py-3 text-sm font-bold text-white">进入可切换体验<ArrowRight size={17}/></a>
            </div>
            <div className="grid divide-y divide-[#e3ebe7] md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-6">
              {careLoopSteps.map(({icon:Icon,title,detail})=><div key={title} className="min-h-40 p-5"><span className="grid size-10 place-items-center rounded-2xl bg-[#e8f3ed] text-[#287153]"><Icon size={19}/></span><b className="mt-4 block text-sm">{title}</b><p className="mt-2 text-xs leading-5 text-[#718078]">{detail}</p></div>)}
            </div>
            <div className="grid gap-3 border-t border-[#e1ebe6] bg-[#f8fbf9] p-5 sm:grid-cols-3">
              <a href="hospital.html?view=orders" className="flex items-center justify-between rounded-xl border border-[#cfe2d8] bg-white px-4 py-3 text-sm font-bold text-[#246b50]">医生签署护理方案<ArrowRight size={16}/></a>
              <a href="hospital.html?view=alerts" className="flex items-center justify-between rounded-xl border border-[#ead6b5] bg-white px-4 py-3 text-sm font-bold text-[#88601f]">处理风险与漏执行<ArrowRight size={16}/></a>
              <a href="hospital.html?view=followups" className="flex items-center justify-between rounded-xl border border-[#d2ddeb] bg-white px-4 py-3 text-sm font-bold text-[#3e6f8d]">录入复诊效果<ArrowRight size={16}/></a>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe9e4] bg-white/80 py-16">
          <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
            <div className="mb-8"><p className="text-xs font-bold tracking-[.18em] text-[#37785b]">PRODUCT ENTRY</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">两个产品入口，三种权限角色</h2></div>
            <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <article className="rounded-[30px] border border-[#bddccc] bg-[linear-gradient(145deg,#f7fffa,#edf7f2)] p-6 shadow-[0_18px_52px_rgba(37,87,63,.09)] sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#286d51]"><Smartphone size={15}/>微信端</span><h3 className="mt-4 text-2xl font-bold">宠馨智小程序</h3><p className="mt-2 text-sm text-[#63776d]">一个安装包、一个AppID、一个登录入口</p></div><span className="rounded-full bg-[#216e50] px-3 py-1.5 text-xs font-bold text-white">pet_owner + doctor</span></div>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white/85 p-5"><div className="flex items-center gap-2 font-bold"><UserRound size={19} className="text-[#247153]"/>宠主页面</div><ul className="mt-4 space-y-2.5 text-sm text-[#5c7166]">{ownerFeatures.map(item=><li key={item} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#3d8b69]"/>{item}</li>)}</ul><a href="index.html" className="mt-5 flex items-center justify-between rounded-xl bg-[#e9f5ee] px-4 py-3 text-sm font-bold text-[#246b50]">查看现有宠主功能预览<ArrowRight size={16}/></a></div>
                  <div className="rounded-2xl border border-white bg-white/85 p-5"><div className="flex items-center gap-2 font-bold"><Stethoscope size={19} className="text-[#3c7193]"/>医生页面</div><ul className="mt-4 space-y-2.5 text-sm text-[#5c7166]">{doctorFeatures.map(item=><li key={item} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#5a8fb1]"/>{item}</li>)}</ul><a href="hospital.html" className="mt-5 flex items-center justify-between rounded-xl bg-[#eaf1f7] px-4 py-3 text-sm font-bold text-[#356f96]">查看现有医生功能预览<ArrowRight size={16}/></a></div>
                </div>
                <p className="mt-5 rounded-xl bg-[#fff6e8] px-4 py-3 text-xs leading-5 text-[#7c5c2b]">以上两个网页只是当前功能预览；生产版本已在同一个 <b>miniprogram</b> 目录中按角色路由，不是两个小程序。</p>
              </article>

              <article className="rounded-[30px] border border-[#dcd1eb] bg-[linear-gradient(145deg,#fff,#f7f3fb)] p-6 shadow-[0_18px_52px_rgba(84,61,113,.08)] sm:p-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#72569a]"><Code2 size={15}/>电脑端</span>
                <h3 className="mt-4 text-2xl font-bold">管理后台 Web</h3><p className="mt-2 text-sm leading-6 text-[#6f6878]">仅 admin 角色访问，不出现在微信小程序菜单。</p>
                <ul className="mt-6 space-y-3 text-sm text-[#5f5968]">{adminFeatures.map(item=><li key={item} className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#8061a7]"/>{item}</li>)}</ul>
                <a href="admin/index.html" className="mt-7 flex items-center justify-between rounded-xl bg-[#73559a] px-4 py-3.5 text-sm font-bold text-white">进入独立Web管理后台<ArrowRight size={17}/></a>
                <a href="developer.html" className="mt-3 block text-center text-xs font-semibold text-[#72569a]">查看原开发者配置预览（保留）</a>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-xs font-bold tracking-[.18em] text-[#37785b]">DATA ISOLATION</p><h2 className="mt-2 text-2xl font-bold">医院不是靠前端隐藏病例，而是数据库拒绝越权</h2><p className="mt-4 text-sm leading-7 text-[#65776e]">医生注册后先绑定或申请新建医院；管理员核验资质后才建立医院成员关系。宠主为宠物选择就诊医院并授权后，本院医生才能读取病例。其他医院即使修改请求参数，数据库行级权限也不会返回数据。</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#dce8e2] bg-white p-5"><Building2 className="text-[#397659]"/><b className="mt-4 block">医生绑定医院</b><p className="mt-2 text-xs leading-5 text-[#718078]">选择已有医院或提交新医院资料，等待审核</p></div>
              <div className="rounded-2xl border border-[#dce8e2] bg-white p-5"><FileCheck2 className="text-[#397659]"/><b className="mt-4 block">宠主授权病例</b><p className="mt-2 text-xs leading-5 text-[#718078]">按宠物和医院建立可撤回的数据授权</p></div>
              <div className="rounded-2xl border border-[#dce8e2] bg-white p-5"><LockKeyhole className="text-[#397659]"/><b className="mt-4 block">数据库强制隔离</b><p className="mt-2 text-xs leading-5 text-[#718078]">所有病例、任务、打卡和报告都按医院校验</p></div>
            </div>
          </div>
        </section>

        <section className="bg-[#1e4435] px-5 py-12 text-white sm:px-8"><div className="mx-auto flex max-w-[1220px] flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-bold"><Bot size={19}/>AI的正确位置</div><p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">医生负责治疗决策；AI负责读取医生已批准方案、生成每日任务、整理家庭记录、检索已审核知识、标记风险并把摘要回传医生。</p></div><div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs"><Settings2 size={16}/>模型密钥只保存在后端API</div></div></section>
      </main>
    </div>
  );
}

function LivePreview({title,detail,src,href,tone}:{title:string;detail:string;src:string;href:string;tone:'green'|'blue'|'purple'}){
  const colors={green:'border-[#bddccc] bg-[#edf8f2] text-[#216e50]',blue:'border-[#c6dce9] bg-[#eef6fb] text-[#356f96]',purple:'border-[#ddd1eb] bg-[#f6f1fb] text-[#72569a]'}[tone];
  return <article className="overflow-hidden rounded-[28px] border border-[#dce7e2] bg-white shadow-[0_18px_48px_rgba(38,77,59,.08)]"><div className="relative h-[330px] overflow-hidden bg-[#edf3f0]"><iframe title={`${title}真实页面预览`} src={src} className="pointer-events-none h-[700px] w-[430px] origin-top-left scale-[.48] border-0"/><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/80 to-transparent px-5 pb-3 pt-16 text-[10px] font-bold text-[#5f7469]">实时页面缩放预览</span></div><div className="p-5"><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[#6d7e75]">{detail}</p><a href={href} className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold ${colors}`}>进入{title}<ArrowRight size={16}/></a></div></article>
}
