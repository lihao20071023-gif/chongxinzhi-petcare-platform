# 宠馨智生产架构

## 结论

宠馨智不是三个小程序，也不是三套后端。

```text
宠馨智微信小程序（同一个 AppID、同一份代码）
├── pet_owner 页面
└── doctor 页面

宠馨智 Web 管理后台
└── admin 页面（仅电脑端）

统一 Node.js API 服务（`server/`）
└── 认证 + 业务 + AI + 管理接口

共享 Supabase Postgres 数据库
└── RLS 强制宠主、本院医生、管理员的数据权限
```

## 目录对应关系

| 目录 | 用途 |
| --- | --- |
| `miniprogram/` | 唯一微信小程序，宠主和医生共用 |
| `src/app/developer/` | Web 管理后台 |
| `server/` | 所有客户端共用的唯一 Node.js API |
| `supabase/migrations/` | 所有角色共用的一套数据库 |
| `src/app/page.tsx`、`src/app/hospital/` | 早期浏览器功能预览，不是额外小程序 |

## 角色路由

1. 微信登录只进入 `pages/login/index`。
2. 后端校验微信 `code`，返回服务器角色。
3. `pet_owner` 进入 `pages/owner/home/index`。
4. `doctor` 且医院绑定已审核，进入 `pages/doctor/home/index`。
5. `doctor` 未审核，只进入 `pages/doctor/hospital-bind/index`。
6. `admin` 不允许进入小程序管理页，必须使用 Web 管理后台。

角色不能靠本地按钮自行切换。小程序本地保存的角色只用于快速显示，最终权限每次仍由 API 和数据库判断。

## 医院与病例隔离

- 医生注册时可以选择平台中已核验医院，或提交新医院资料。
- 管理员核验证件后调用 `review_doctor_application`，建立 `hospital_members` 关系。
- 宠主为宠物选择医院时建立 `pet_hospital_consents`。
- 医生读取病例时必须同时满足：
  - 是该医院的有效成员；
  - 宠物对该医院的授权未撤回。
- 这一判断由 PostgreSQL RLS 执行，不依赖前端隐藏。

## AI边界

AI仅从 `knowledge_entries` 中读取 `approved` 条目，并通过统一 API 调用模型。模型密钥不能写在小程序里。

AI可以：

- 回答院后护理问题；
- 把医生已确认方案整理成每日任务；
- 汇总打卡趋势和异常线索；
- 输出引用来源并在资料不足时追问。

AI不可以：

- 独立诊断；
- 开药、停药、加药或修改剂量；
- 根据家庭记录自动修改IRIS分期；
- 在没有已审核知识时编造结论。

## 部署前必须配置

统一 Node.js API 的环境变量：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WECHAT_APP_ID
WECHAT_APP_SECRET
WECHAT_OPENID_PEPPER
SUPABASE_JWT_SECRET
AI_API_URL
AI_API_KEY
AI_MODEL
```

其中 `WECHAT_APP_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_JWT_SECRET` 和 `AI_API_KEY` 只能放在服务端。`SUPABASE_JWT_SECRET` 必须使用该 Supabase 项目实际接受的签名密钥，才能让数据库 RLS 识别 `auth.uid()`。

## 从当前代码到可用版本

1. 创建 Supabase PostgreSQL 项目，执行全部 migration。
2. 部署 `server/` Node.js API。
3. 在Node.js服务器环境中配置微信和AI密钥。
4. 在 `miniprogram/config.js` 填写部署后的 API HTTPS 地址。
5. 在微信公众平台注册小程序并取得正式 AppID。
6. 在微信开发者工具中导入 `miniprogram/`，把 `project.config.json` 的 `appid` 换成正式 AppID。
7. 配置微信“request合法域名”为 Supabase Function 域名。
8. 在 Web 后台建立第一个 `platform_admin` 账号。
9. 用真实医生走一次医院绑定和审核。
10. 用真实宠主建立宠物、选择医院、完成打卡、医生查看回传，做完整验收。

## 当前尚未伪装为完成的部分

- 正式微信 AppID 和登录密钥；
- 已部署的 Supabase 项目；
- 报告私有存储桶和签名上传；
- 已选择并配置的AI模型；
- 微信订阅消息提醒；
- 生产管理员登录与真实资质审核数据。

这些配置缺失时，小程序会明确提示“尚未配置”，不会生成虚构成功状态。
