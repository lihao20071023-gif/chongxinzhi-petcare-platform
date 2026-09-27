import { createClient } from '@supabase/supabase-js';

const url = String(process.env.SUPABASE_URL || '').trim();
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const displayName = String(process.env.ADMIN_DISPLAY_NAME || '宠馨智管理员').trim();

if (!url || !serviceKey || !email || !password) {
  console.error('缺少 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY、ADMIN_EMAIL 或 ADMIN_PASSWORD。');
  process.exit(1);
}
if (password.length < 12) {
  console.error('管理员初始密码至少需要12个字符。');
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let user = null;
const created = await client.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.error) {
  user = created.data.user;
} else {
  const listed = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  user = listed.data.users.find((item) => String(item.email || '').toLowerCase() === email) || null;
  if (!user) throw created.error;
  const updated = await client.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (updated.error) throw updated.error;
  user = updated.data.user;
}

const profile = await client.from('user_profiles').upsert({
  id: user.id,
  display_name: displayName,
  platform_role: 'platform_admin'
}).select('id,display_name,platform_role').single();
if (profile.error) throw profile.error;

console.log(`管理员账号已建立：${email}`);
console.log('请立即登录管理后台验证，并从环境变量或临时配置中删除 ADMIN_PASSWORD。');
