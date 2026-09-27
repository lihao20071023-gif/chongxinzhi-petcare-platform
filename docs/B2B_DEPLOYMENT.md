# 宠馨智 B 端部署说明

## 当前状态

- 宠主端和医院端页面已构建。
- Supabase数据库迁移、RLS权限和客户端适配器已创建。
- 工作区没有Supabase项目URL和匿名密钥，因此尚未部署到云端。
- 工作区没有“模块一/三/四/五”的原始文件，无法替用户登录扣子并粘贴这些模块。

## 1. 创建 Supabase 项目

1. 在Supabase创建生产项目，启用邮箱登录。
2. 在SQL Editor执行`supabase/migrations/202607220001_b2b_core.sql`。
3. 将`.env.example`复制为`.env.local`，填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

匿名密钥可进入浏览器；`service_role`密钥严禁放入`NEXT_PUBLIC_*`或提交到仓库。

## 2. 创建首家医院与管理员

先在Supabase Authentication创建医院管理员，再由平台安全服务写入：

```sql
insert into public.hospitals(name,code) values ('试点动物医院','pilot-hospital');
insert into public.hospital_members(hospital_id,user_id,role)
select id,'AUTH_USER_UUID','hospital_admin' from public.hospitals where code='pilot-hospital';
```

## 3. 宠主授权

医院不得仅凭手机号查询平台全部宠物。宠主扫码或接受邀请后，向`pet_hospital_consents`写入授权范围；撤销时写入`revoked_at`。医院端RLS只允许读取有效授权宠物。

## 4. HIS 接入

优先顺序：REST API / Webhook > SFTP CSV > 只读数据库视图。连接信息写入`his_connections`时必须由服务端加密，浏览器不直接持有HIS密码。

每个HIS连接器必须实现：

- 客户、宠物、就诊、诊断、处方、检验报告字段映射；
- 原始载荷留存与统一指标编码；
- `hospital_id + his_external_id`幂等去重；
- 增量游标、失败重试、冲突人工核对；
- 同步结果写入`his_sync_jobs`和`audit_logs`。

## 5. 生产上线前必须补充

- 统一Node.js服务端API；
- 文件存储桶及报告访问策略；
- 医院管理员邀请和成员权限管理；
- 客服消息、提醒推送和审计写入；
- 数据备份、恢复演练、隐私授权文本；
- 医疗内容审核、处方电子签名和AI输出追踪。

## 扣子步骤

当前仓库只有`src/lib/coze-bot-config.ts`中的Bot配置，没有用户所说的完整模块一/三/四/五文件。获得原始模块文件后再分别粘贴人设、B端参数、开场白与推荐问题。皇家和希尔斯知识目前已在本系统中结构化；上传扣子时应使用完整Markdown源文件，而不是从截断内容推断缺失产品。
