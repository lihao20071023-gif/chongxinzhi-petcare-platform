'use client';
import { useEffect,useState } from 'react';
import { Bot, ChartNoAxesCombined, ClipboardCheck, Home, LayoutGrid, PawPrint, UserRound } from 'lucide-react';
import { usePetProfile, type PetProfile } from './pet-profile-context';
import { loadDailyCheckins } from '@/lib/daily-checkins';
import type { MedicalReportAnalysis } from '@/lib/medical-report-analyzer';

export type Tab = 'home' | 'care' | 'monitor' | 'ai' | 'knowledge' | 'marketplace' | 'profile' | 'features';
const baseItems = [
  { id: 'home', label: '首页', Icon: Home }, { id: 'care', label: '护理', Icon: ClipboardCheck },
  { id: 'monitor', label: '记录', Icon: ChartNoAxesCombined }, { id: 'ai', label: 'AI管家', Icon: Bot },
  { id: 'profile', label: '档案', Icon: UserRound },
] as const;

export function AppShell({ tab, setTab, children }: { tab: Tab; setTab: (tab: Tab) => void; children: React.ReactNode }) {
  const {profile}=usePetProfile();
  const [moduleConfig,setModuleConfig]=useState<Record<string,{enabled:boolean;label:string}>>({});
  useEffect(()=>{try{setModuleConfig(JSON.parse(localStorage.getItem('petcare-developer-module-config-v1')||'{}'))}catch{setModuleConfig({})}},[]);
  useEffect(()=>{const handler=()=>exportHealthReport(profile);window.addEventListener('petcare:export-health-report',handler);return()=>window.removeEventListener('petcare:export-health-report',handler)},[profile]);
  const items=baseItems.filter(x=>!['care','monitor','ai'].includes(x.id)||moduleConfig[x.id]?.enabled!==false).map(x=>({...x,label:moduleConfig[x.id]?.label||x.label}));
  return <div className="pet-page mx-auto min-h-screen max-w-[430px] text-[#20352b] shadow-[0_0_45px_rgba(32,70,52,.10)]">
    <header className="sticky top-0 z-40 border-b border-[#deebe4] bg-white/94 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 w-full max-w-[430px] items-center justify-between px-4">
        <button onClick={() => setTab('home')} className="flex items-center gap-2.5 font-bold text-[#174f3a]">
          <span className="relative grid size-10 place-items-center rounded-[14px] bg-[#287657] text-white shadow-sm"><PawPrint size={21}/><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-[#efb45d]"/></span>
<span className="text-left leading-tight">宠馨智 <i className="mt-0.5 block text-[10px] font-normal not-italic text-[#6d7f75]">医生协同 · 慢病 AI 管家</i></span>
        </button>
        <div className="flex items-center gap-2">
<button onClick={()=>setTab('features')} aria-label="打开全部功能" className={`grid size-9 place-items-center rounded-xl border border-[#dbe6e0] ${tab==='features'?'bg-[#287657] text-white':'bg-white text-[#4a7460]'}`}><LayoutGrid size={17}/></button>
<button onClick={() => setTab('profile')} className="grid size-9 place-items-center rounded-full bg-[#e4f0e9] text-[#286c51]">
<UserRound size={18}/>
</button>
</div>
      </div>
    </header>
    <main className="mx-auto w-full max-w-[430px] px-3 pb-28 pt-3">{children}</main>
    <nav className="fixed bottom-0 left-1/2 z-50 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-x border-t border-[#dce8e1] bg-white/96 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(37,75,57,.10)] backdrop-blur-xl">{items.map(({ id, label, Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex min-w-0 flex-col items-center gap-1 py-1 text-[10px] ${tab === id ? 'font-semibold text-[#1f7655]' : 'text-[#75867d]'}`}>
<span className={`grid place-items-center rounded-xl ${tab===id&&id==='monitor'?'size-10 -mt-3 border-4 border-white bg-[#287657] text-white shadow-md':'size-8'} ${tab===id&&id!=='monitor'?'bg-[#e3f3ea]':''}`}><Icon size={tab===id&&id==='monitor'?21:20} strokeWidth={tab === id ? 2.5 : 2}/></span>
<span>{label}</span>
</button>)}</nav>
  </div>;
}

function exportHealthReport(profile:PetProfile) {
  const report = window.open('', '_blank', 'width=860,height=900');
  if (!report) return;
  const checkins=loadDailyCheckins(profile.id);let reports:MedicalReportAnalysis[]=[];try{reports=JSON.parse(localStorage.getItem(`petcare-medical-reports:${profile.id}`)||'[]')}catch{reports=[]}
  const rows=checkins.map(x=>`<tr><td>${new Date(x.recordedAt).toLocaleString('zh-CN')}</td><td>${x.weightKg??'未填'}</td><td>${x.waterMl??'未填'}</td><td>${x.appetite}</td><td>${x.spirit}</td></tr>`).join('');
  const reportRows=reports.map(x=>`<tr><td>${new Date(x.createdAt).toLocaleDateString('zh-CN')}</td><td>${x.reportTypeLabel}</td><td>${x.sourceFile}</td><td>${x.needsOcr?'OCR待核对':'用户已保存'}</td></tr>`).join('');
  const hospital=profile.hospital?`${profile.hospital}（${profile.careAuthorization==='verified'?'医院已验证连接':'用户记录，未连接'}）`:'未填写';
  report.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${profile.name}健康报告</title>
<style>@page{size:A4;margin:18mm}body{font:14px Arial,"PingFang SC",sans-serif;color:#263b31}h1{color:#226b4d;margin-bottom:4px}h2{margin-top:24px;border-bottom:2px solid #dbe9e1;padding-bottom:7px;color:#315b47}.meta{color:#6b7b72}.alert{background:#fff2ef;border:1px solid #efc8c1;padding:12px;border-radius:8px;color:#8c4942}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #dce5df;padding:8px;text-align:left}th{background:#edf5f0}.footer{margin-top:30px;font-size:11px;color:#7c8982}</style>
</head>
<body>
<h1>宠馨智 · 慢病健康报告</h1>
<p class="meta">宠物：${profile.name} · ${profile.breed} · ${profile.disease||'未填写病种'} ${profile.stage||''}<br>主治医院：${hospital}<br>主治医生：${profile.doctor||'未填写'} · 生成日期：${new Date().toLocaleDateString('zh-CN')}</p>
<div class="alert"><b>数据说明：</b>只汇总当前宠物由用户保存或上传的数据；空白项未用模板或互联网信息补齐。</div>
<h2>居家打卡</h2><table><tr><th>时间</th><th>体重kg</th><th>饮水ml</th><th>食欲</th><th>精神</th></tr>${rows||'<tr><td colspan="5">暂无用户打卡</td></tr>'}</table>
<h2>已保存检查报告</h2><table><tr><th>时间</th><th>类型</th><th>文件</th><th>来源</th></tr>${reportRows||'<tr><td colspan="4">暂无用户上传报告</td></tr>'}</table>
<p class="footer">本报告由宠馨智汇总用户真实保存的数据，仅供护理沟通，不能替代专业诊断。</p>
<script>window.onload=()=>window.print()<\/script>
</body>
</html>`);
  report.document.close();
}
