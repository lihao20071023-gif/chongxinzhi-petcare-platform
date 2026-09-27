'use client';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}

export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    draft: '草稿', in_review: '待复核', approved: '已审核', retired: '已停用', pending: '待审核',
    active: '正常', verified: '已核验', self_submitted: '待核验', rejected: '未通过', suspended: '已暂停', pending_review: '待审核',
    required: '必要数据', optional: '按需提供', not_connected: '未授权'
  };
  return <span className={`status status-${value}`}>{labels[value] || value}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon"><AlertCircle size={22} /></div><strong>{title}</strong><p>{description}</p></div>;
}

export function LoadingState({ label = '正在读取真实数据' }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={22} />{label}</div>;
}

export function Toast({ type = 'success', children, onClose }: { type?: 'success' | 'error'; children: ReactNode; onClose: () => void }) {
  return <div className={`toast toast-${type}`} role="status">{type === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<span>{children}</span><button onClick={onClose} aria-label="关闭提示"><X size={17} /></button></div>;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}{required ? <em> *</em> : null}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function Drawer({ title, description, onClose, children, footer }: { title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={title}>
    <button className="drawer-backdrop" aria-label="关闭" onClick={onClose} />
    <section className="drawer">
      <header><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div><button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button></header>
      <div className="drawer-body">{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </section>
  </div>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action}</div>;
}

export function TableShell({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className="table-shell" {...props}>{children}</div>;
}
