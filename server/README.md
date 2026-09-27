# 宠馨智统一 Node.js API

这是宠馨智唯一的后端 API 服务。微信小程序（宠主 + 医生）和 Web 管理后台都调用它，共用一个 PostgreSQL 数据库。

## 启动

```bash
cp .env.api.example .env.api
# 填写真实密钥后：
set -a && source .env.api && set +a
pnpm api
```

健康检查：`GET http://127.0.0.1:8787/api/v1/health`

部署就绪检查：`GET http://127.0.0.1:8787/api/v1/ready`。`health` 只代表进程活着，`ready` 用来显示数据库、微信、大模型和文件存储配置是否齐全。

部署前执行：

```bash
pnpm backend:preflight
pnpm api:check
pnpm api:test
```

完整操作清单见 `docs/BACKEND_DEPLOYMENT_CHECKLIST.md`。

微信小程序的 `miniprogram/config.js` 应填写：

```js
apiBaseUrl: 'https://你的API域名/api/v1'
```

生产环境必须使用 HTTPS。不得把 `SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_JWT_SECRET`、`WECHAT_APP_SECRET` 或 `AI_API_KEY` 写进小程序。

## API范围

| 模块 | 主要接口 |
| --- | --- |
| 微信登录 | `POST /auth/wechat`、`GET /me` |
| 管理员首次开通 | `GET /auth/admin-setup-status`、`POST /auth/admin-setup`；仅系统无管理员且配置一次性口令时开放 |
| 医院 | `GET /hospitals`、`POST /owner/hospital-bindings`、`GET/POST /doctor/hospital-bindings` |
| 宠物档案 | `GET/POST /pets`、`GET/PATCH/DELETE /pets/:petId` |
| 健康打卡 | `GET/POST /pets/:petId/checkins` |
| 化验单 | `GET/POST /pets/:petId/lab-reports`、`POST /pets/:petId/lab-reports/upload-ticket` |
| 病例 | `GET/POST /cases`、`GET/PATCH/DELETE /cases/:caseId` |
| 护理方案 | `GET/POST /cases/:caseId/care-plans`、`PATCH/DELETE /care-plans/:planId`、`POST /care-plans/:planId/publish` |
| AI拆任务 | `POST /cases/:caseId/care-plans/generate-tasks` |
| 今日任务 | `GET /tasks/today`、`PATCH/DELETE /tasks/:taskId`、`POST /tasks/:taskId/checkins` |
| AI问答 | `POST /ai/chat`，返回 `answer` 和 `sources` |
| 管理登录 | `POST /auth/admin-password`，仅 `platform_admin` |
| 管理看板 | `GET /admin/dashboard`，真实用户数、日活、病例数、任务完成率与14天趋势 |
| 知识库管理 | `GET/POST /admin/knowledge`、`GET/PATCH/DELETE /admin/knowledge/:knowledgeId` |
| 医院管理 | `GET /admin/hospitals`、`POST /admin/hospital-applications/:id/review`、`PATCH /admin/hospitals/:id` |
| 系统配置 | `GET/PATCH /admin/settings` |

所有业务接口都要求 `Authorization: Bearer <token>`。

## 权限规则

- `pet_owner`：管理自己的宠物、选择医院、上传报告、打卡、读取医生发布的护理方案。
- `doctor`：必须先通过医院绑定审核；只能访问宠主授权给本院的病例。
- `admin`：只从 Web 管理后台调用管理接口，不进入微信小程序管理页面。
- AI生成的护理任务只能保存为草稿，医生调用发布接口后宠主才能看到。
- 宠主问答只检索已审核知识，返回资料来源；未命中资料时明确说明依据不足。
- 健康打卡先执行安全规则，再在已配置模型时生成异常摘要；AI失败不会使已保存的真实打卡丢失。
- 异常提醒保存在 `health_alerts`，只用于复核和就医分流，不改变诊断、分期、药物或护理方案。

## 数据库

按顺序执行 `supabase/migrations/` 下的SQL。生产数据隔离不只靠前端角色判断，PostgreSQL RLS会再次校验宠物所有权、医院成员关系和宠主授权。
