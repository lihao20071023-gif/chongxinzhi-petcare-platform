import type { LucideIcon } from 'lucide-react';

export function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex items-start justify-between gap-4"><div><span className="mb-2 block h-1 w-9 rounded-full bg-[#efb45d]"/><h1 className="text-2xl font-bold text-[#193c2d] sm:text-[28px]">{title}</h1><p className="mt-1 text-sm leading-6 text-[#718078]">{subtitle}</p></div>{action}</div>;
}
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`pet-card rounded-2xl border border-[#e0e9e4] bg-white ${className}`}>{children}</section>; }
export function IconBox({ icon: Icon, tone = 'green' }: { icon: LucideIcon; tone?: 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = { green: 'bg-[#e3f2e9] text-[#237352]', amber: 'bg-[#fff1d9] text-[#ac6d12]', red: 'bg-[#fde8e6] text-[#bd554d]', blue: 'bg-[#e6f0f7] text-[#3f718e]' };
  return <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${colors[tone]}`}><Icon size={20}/></span>;
}
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) { return <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-[#254536]"><span className="size-2 rounded-full bg-[#efb45d]"/>{children}</h2>{action}</div>; }
export function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'red' }) { const c = tone === 'green' ? 'bg-[#e1f1e7] text-[#246c50]' : tone === 'amber' ? 'bg-[#fff0d4] text-[#9d6417]' : 'bg-[#fde5e2] text-[#a74943]'; return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>{children}</span>; }
