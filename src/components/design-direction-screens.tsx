import { ArrowLeft, CheckCircle2, MonitorCog, Smartphone, Stethoscope } from 'lucide-react';

const mobileConcept = '/design/mobile-owner-doctor-concept-v2.png';
const adminConcept = '/design/developer-admin-concept-v2.png';

function DirectionHeader({title,detail}:{title:string;detail:string}) {
  return <header className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 pb-7 pt-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <a href="portal.html" className="inline-flex items-center gap-2 text-sm font-bold text-[#24745b]"><ArrowLeft size={16}/>返回宠馨智系统总入口</a>
      <h1 className="mt-5 text-3xl font-black tracking-tight text-[#153a31] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[#60776e] sm:text-base">{detail}</p>
    </div>
    <div className="flex flex-wrap gap-2 text-xs font-bold">
      <span className="rounded-full bg-[#daf3e9] px-4 py-2 text-[#24745b]">第一版视觉延续</span>
      <span className="rounded-full bg-[#e8f1fb] px-4 py-2 text-[#376f9e]">现有功能不删除</span>
    </div>
  </header>;
}

function ConceptImage({src,alt}:{src:string;alt:string}) {
  return <div className="overflow-hidden rounded-[30px] border border-[#d7e6e0] bg-white shadow-[0_28px_80px_rgba(30,77,60,.13)]">
    <img src={src} alt={alt} className="h-auto w-full" />
  </div>;
}

function MobileNotes() {
  return <section className="grid gap-4 md:grid-cols-3">
    <article className="rounded-3xl bg-[#e5f6ef] p-5"><Smartphone className="text-[#278064]"/><b className="mt-4 block text-[#173f34]">宠主端</b><p className="mt-2 text-sm leading-6 text-[#5d756b]">宠物身份、医生方案、今日护理、三层记录、健康档案和急症就医都集中在手机操作。</p></article>
    <article className="rounded-3xl bg-[#eaf3fb] p-5"><Stethoscope className="text-[#377aa4]"/><b className="mt-4 block text-[#173f34]">医生端</b><p className="mt-2 text-sm leading-6 text-[#5d756b]">按红橙黄绿风险处理病例，签署方案、查看趋势、验证复诊效果，AI不替医生决策。</p></article>
    <article className="rounded-3xl bg-[#fff2e4] p-5"><CheckCircle2 className="text-[#d7843e]"/><b className="mt-4 block text-[#173f34]">真实 App 感</b><p className="mt-2 text-sm leading-6 text-[#5d756b]">沿用第一版双手机、薄荷绿和医疗蓝体系，不再使用第二版网页卡片式手机预览。</p></article>
  </section>;
}

export function OwnerDesignScreen() {
  return <main className="min-h-screen bg-[linear-gradient(180deg,#f2faf6,#edf3f1)] pb-14">
    <DirectionHeader title="宠馨智手机端设计方向" detail="这是第一版双手机设计的新增功能版本：左侧为宠主，右侧为医院／医生。正式开发时仍是同一个微信小程序，登录后按角色自动显示页面。"/>
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 sm:px-8"><ConceptImage src={mobileConcept} alt="宠馨智宠主端与医生端双手机新版设计图"/><MobileNotes/></div>
  </main>;
}

export function DoctorDesignScreen() {
  return <OwnerDesignScreen/>;
}

export function AdminDesignScreen() {
  return <main className="min-h-screen bg-[linear-gradient(180deg,#f3faf8,#edf3f4)] pb-14">
    <DirectionHeader title="宠馨智开发者管理后台" detail="这是与你认可的第一版手机端属于同一视觉体系的独立电脑后台。只有 admin 可以登录；普通宠主和医生不会在小程序中看到管理入口。"/>
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-8">
      <ConceptImage src={adminConcept} alt="宠馨智独立开发者Web管理后台新版设计图"/>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-white p-5 shadow-sm"><MonitorCog className="text-[#28745b]"/><b className="mt-4 block">独立 Web 登录</b><p className="mt-2 text-sm leading-6 text-[#667a72]">后台拥有单独网址和管理员认证，不放进微信小程序，不向客户开放。</p></article>
        <article className="rounded-3xl bg-white p-5 shadow-sm"><CheckCircle2 className="text-[#28745b]"/><b className="mt-4 block">统一管理</b><p className="mt-2 text-sm leading-6 text-[#667a72]">用户、医院、医生资质、知识库、AI模型、安全规则、提醒规则和功能模块集中管理。</p></article>
        <article className="rounded-3xl bg-white p-5 shadow-sm"><Stethoscope className="text-[#28745b]"/><b className="mt-4 block">医疗数据有边界</b><p className="mt-2 text-sm leading-6 text-[#667a72]">管理员可以配置系统，但已签医嘱、病历和审核修改必须留痕，不能无痕篡改。</p></article>
      </section>
    </div>
  </main>;
}

export function DesignDirectionGallery() {
  return <main className="min-h-screen bg-[linear-gradient(180deg,#f2faf6,#edf3f1)] pb-16">
    <DirectionHeader title="第一版风格 · 新功能设计方向" detail="已撤掉不符合你要求的第二版手机卡片页面。下面直接展示以第一版双手机为视觉基准生成的新版本，以及与它配套的独立开发者后台。"/>
    <div className="mx-auto max-w-[1500px] space-y-10 px-4 sm:px-8">
      <section id="mobile" className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><span className="text-xs font-black uppercase tracking-[.25em] text-[#2b8064]">Mobile App</span><h2 className="mt-2 text-2xl font-black text-[#173f34]">宠主端＋医院／医生端</h2></div><a href="design-admin.html" className="rounded-xl bg-[#1d6f58] px-4 py-3 text-sm font-bold text-white">查看开发者后台</a></div><ConceptImage src={mobileConcept} alt="宠馨智双手机新版设计方向"/><MobileNotes/></section>
      <section id="admin" className="space-y-5 border-t border-[#cfdfd8] pt-10"><div><span className="text-xs font-black uppercase tracking-[.25em] text-[#39729b]">Admin Web</span><h2 className="mt-2 text-2xl font-black text-[#173f34]">独立开发者管理后台</h2></div><ConceptImage src={adminConcept} alt="宠馨智开发者后台新版设计方向"/></section>
    </div>
  </main>;
}
