'use client';

import type { ReactNode } from 'react';
import { BarChart3, Bell, BookOpen, Building2, Database, LogOut, Menu, Search, Settings2, X } from 'lucide-react';
import type { Session } from '@/lib/types';

export type AdminView = 'dashboard' | 'business' | 'knowledge' | 'hospitals' | 'settings';

const nav: Array<{ id: AdminView; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: '数据看板', icon: BarChart3 },
  { id: 'business', label: '业务与数据', icon: Database },
  { id: 'knowledge', label: '知识库管理', icon: BookOpen },
  { id: 'hospitals', label: '医院与医生', icon: Building2 },
  { id: 'settings', label: '规则与提醒', icon: Settings2 }
];

export function AppShell({ session, view, mobileOpen, onToggleMobile, onView, onLogout, children }: { session: Session; view: AdminView; mobileOpen: boolean; onToggleMobile: () => void; onView: (view: AdminView) => void; onLogout: () => void; children: ReactNode }) {
  return <div className="app-shell">
    <aside className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="brand"><img src="/admin/chongxinzhi-mark.png" alt="" /><div><strong>宠馨智管理后台</strong><span>院后护理协同平台</span></div></div>
      <button className="mobile-close" onClick={onToggleMobile} aria-label="关闭菜单"><X /></button>
      <nav>{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'nav-item nav-active' : 'nav-item'} onClick={() => { onView(item.id); if (mobileOpen) onToggleMobile(); }}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>
      <div className="sidebar-note"><img src="/admin/chongxinzhi-mark.png" alt=""/><p>后台操作写入审计记录<br />医疗决策仍由兽医负责</p></div>
    </aside>
    {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭菜单" onClick={onToggleMobile} /> : null}
    <div className="app-main">
      <header className="topbar">
        <button className="menu-button" onClick={onToggleMobile} aria-label="打开菜单"><Menu /></button>
        <label className="admin-search"><Search size={17}/><input placeholder="搜索用户、医院、知识条目…"/></label>
        <div className="topbar-spacer" />
        <button className="admin-bell" aria-label="通知"><Bell size={18}/><i/></button>
        <a className="portal-link" href="../portal.html">系统总入口</a>
        <div className="admin-account"><span>{session.user.displayName.slice(0, 1)}</span><div><strong>{session.user.displayName}</strong><small>平台管理员</small></div></div>
        <button className="logout-button" onClick={onLogout}><LogOut size={17} />退出</button>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
