'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, KeyRound, LockKeyhole, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { adminLogin, API_BASE, createFirstAdmin, getAdminSetupStatus, saveSession, type AdminSetupStatus } from '@/lib/api';
import type { Session } from '@/lib/types';
import { createLocalAdmin, hasLocalAdmin, loginLocalAdmin } from '@/lib/local-admin';
import { Button } from './ui';

export function LoginScreen({ onLogin, onPreview }: { onLogin: (session: Session) => void; onPreview: () => void }) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [setupStatus, setSetupStatus] = useState<AdminSetupStatus | null>(null);
  const [runtime, setRuntime] = useState<'checking' | 'cloud' | 'local'>('checking');
  const [statusError, setStatusError] = useState('');
  const [displayName, setDisplayName] = useState('宠馨智管理员');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSetupStatus()
      .then((status) => {
        if (!active) return;
        setSetupStatus(status);
        if (status.databaseConfigured) {
          setRuntime('cloud');
          if (status.setupAllowed && !status.hasAdmin) setMode('setup');
        } else {
          setRuntime('local');
          setMode(hasLocalAdmin() ? 'login' : 'setup');
        }
      })
      .catch((reason) => {
        if (!active) return;
        setStatusError(reason instanceof Error ? reason.message : '管理API无法连接');
        setRuntime('local');
        setMode(hasLocalAdmin() ? 'login' : 'setup');
      });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const session = runtime === 'local' ? await loginLocalAdmin(email, password) : await adminLogin(email, password);
      if (session.user.role !== 'admin') throw new Error('该账号没有管理员权限');
      saveSession(session);
      onLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally { setBusy(false); }
  }

  async function setup(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setBusy(true);
    try {
      const session = runtime === 'local'
        ? await createLocalAdmin({ displayName, email, password })
        : (await createFirstAdmin({ displayName, email, password, setupToken }), await adminLogin(email, password));
      saveSession(session);
      onLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '管理员创建失败');
    } finally { setBusy(false); }
  }

  const setupUnavailable = runtime === 'cloud' && setupStatus && !setupStatus.hasAdmin && !setupStatus.setupAllowed;

  return <main className="login-page">
    <section className="login-brand">
      <img src="/admin/chongxinzhi-mark.png" alt="宠馨智" />
      <div><strong>宠馨智管理后台</strong><span>让科学的院后照护陪伴更长久</span></div>
    </section>
    <form className="login-panel" onSubmit={mode === 'setup' ? setup : submit}>
      <div className="login-icon">{mode === 'setup' ? <UserRoundPlus /> : <ShieldCheck />}</div>
      <h1>{mode === 'setup' ? '首次创建管理员' : '管理员登录'}</h1>
      <p>{mode === 'setup' ? '设置你自己的管理员姓名、邮箱和密码。创建成功后，首次开通入口会自动关闭。' : '宠主和医生不从这里登录；本页面仅限宠馨智平台管理员。'}</p>

      {runtime === 'local' ? <div className="setup-state setup-state-warning"><AlertCircle size={18}/><span><strong>本机开发者账号模式</strong>现在可以直接创建你自己的邮箱和密码，并在这台电脑保存后台修改。正式上线时再切换到云端数据库账号。{statusError ? <small>云端API尚未启动，当前自动使用本机模式。</small> : null}</span></div> : null}
      {runtime === 'cloud' ? <div className="setup-state setup-state-success"><CheckCircle2 size={18}/><span><strong>云端管理员模式</strong>账号、权限、数据和审计由统一API与数据库管理。</span></div> : null}
      {setupUnavailable ? <div className="setup-state setup-state-warning"><KeyRound size={18}/><span><strong>还不能创建管理员</strong>{setupStatus.databaseConfigured ? '请在API环境变量中设置一次性 ADMIN_SETUP_TOKEN，然后重启API。' : '请先配置Supabase数据库，再设置一次性管理员初始化口令。'}</span></div> : null}
      {setupStatus?.hasAdmin ? <div className="setup-state setup-state-success"><CheckCircle2 size={18}/><span><strong>管理员账号已建立</strong>请输入你创建的邮箱和密码进入后台。</span></div> : null}

      {((runtime === 'local') || (setupStatus && !setupStatus.hasAdmin && setupStatus.setupAllowed)) ? <div className="auth-switch" role="tablist" aria-label="管理员账号操作">
        <button type="button" className={mode === 'setup' ? 'active' : ''} onClick={() => { setMode('setup'); setError(''); }}>首次开通</button>
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>已有账号登录</button>
      </div> : null}

      {mode === 'setup' ? <>
        <label><span>管理员显示名称</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required placeholder="例如：宠馨智负责人" /></label>
        <label><span>管理员邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="请输入你自己的邮箱" /></label>
        <label><span>设置密码</span><div className="password-field"><LockKeyhole size={17} /><input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required placeholder="至少12位，同时包含字母和数字" /></div></label>
        <label><span>确认密码</span><div className="password-field"><LockKeyhole size={17} /><input type="password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required placeholder="再次输入密码" /></div></label>
        {runtime === 'cloud' ? <label><span>一次性初始化口令</span><div className="password-field"><KeyRound size={17} /><input type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} autoComplete="off" required placeholder="填写服务器ADMIN_SETUP_TOKEN" /></div><small className="field-help">该口令只用于首次创建管理员，不是以后登录的密码。创建完成后应从服务器删除。</small></label> : null}
      </> : <>
        <label><span>管理员邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="请输入你设立的邮箱" /></label>
        <label><span>密码</span><div className="password-field"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="请输入密码" /></div></label>
      </>}
      {error ? <div className="form-error">{error}</div> : null}
      <Button type="submit" disabled={busy || runtime === 'checking' || Boolean(setupUnavailable)}>{busy ? (mode === 'setup' ? '正在创建…' : '正在验证…') : (mode === 'setup' ? '创建并进入管理后台' : '登录管理后台')}</Button>
      <button className="preview-entry" type="button" onClick={onPreview}><Eye size={17}/>查看本机界面预览</button>
      <p className="preview-explain">预览不会授予管理权限。医院审核、知识库编辑和系统配置必须使用你创建的管理员账号登录后操作。</p>
      <small>{runtime === 'local' ? '保存位置：当前电脑浏览器（本机开发阶段）' : `API：${API_BASE}`}</small>
    </form>
  </main>;
}
