import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.REPORTS_BUCKET || 'medical-reports';
if (!url || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。');
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const listed = await client.storage.listBuckets();
if (listed.error) throw listed.error;
const existing = listed.data.find((item) => item.id === bucket || item.name === bucket);
if (!existing) {
  const created = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  });
  if (created.error) throw created.error;
  console.log(`已创建私有病历Bucket：${bucket}`);
} else if (existing.public) {
  const updated = await client.storage.updateBucket(bucket, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  });
  if (updated.error) throw updated.error;
  console.log(`已将病历Bucket改为私有：${bucket}`);
} else {
  console.log(`私有病历Bucket已存在：${bucket}`);
}

