# 宠馨智

宠馨智是一个连接宠物医院与宠物主人的宠物慢性病院后护理协同平台。

医生负责诊疗决策并签署护理方案；AI管家负责解释医嘱、拆分每日任务、提醒执行、整理连续趋势和风险分流，不独立诊断、不增减药物。

## 项目组成

```text
宠馨智微信小程序
├── 宠主端：宠物档案、护理任务、打卡、AI问答、检查报告
└── 医生端：病例、医嘱、护理方案、异常队列、复诊提醒

宠馨智Web管理后台
├── 数据与业务看板
├── 知识库管理
├── 医院与医生审核
└── 强制安全规则与提醒配置

统一Node.js API
├── 微信登录和角色权限
├── 宠物、病例、护理方案、任务和打卡接口
├── AI知识检索、任务拆解和风险摘要
└── PostgreSQL/Supabase数据与私有文件存储
```

## 主要目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 当前Next.js产品原型、宠主端与医院端页面 |
| `admin-web/` | 独立Web管理后台 |
| `miniprogram/` | 一个微信小程序工程，宠主和医生按角色显示页面 |
| `server/` | 小程序与管理后台共用的Node.js API |
| `supabase/migrations/` | PostgreSQL数据表、权限与RLS迁移 |
| `scripts/` | 构建、预览、部署预检和初始化工具 |
| `docs/` | 产品、架构、部署和迁移说明 |
| `design/` | 已确认的产品设计方向图 |

## 本地运行

需要 Node.js 22 和 pnpm 10。

```bash
pnpm install
pnpm build
pnpm preview:static
```

浏览器打开：

```text
http://127.0.0.1:3300/portal.html
```

统一API需要先根据 `.env.api.example` 配置本机私密的 `.env.api`：

```bash
set -a
source .env.api
set +a
pnpm backend:preflight
pnpm api
```

## 当前状态

当前仓库包含可构建的产品原型、微信小程序框架、统一API、数据库迁移、管理后台和部署方案。真实Supabase、微信登录、大模型、文件存储、云服务器和正式域名尚需项目负责人创建并配置。

当前浏览器中的本机宠物记录和本机管理员账号不会上传到GitHub，也不会自动进入云端数据库。

## 安全边界

- AI不得独立诊断；
- AI不得新增、停用或调整药物与剂量；
- 危险信号必须优先建议联系医生或及时就医；
- 医疗回答必须引用已经审核的知识；
- 医院只有获得宠主授权后才能读取本院病例；
- 不得把 `.env.api`、微信AppSecret、数据库Service Role Key或大模型API Key提交到GitHub。

## 分支使用

- `main`：当前确认的正式基线；
- `codex/petcare-sandbox`：隔离的试错分支。

新功能应先在试错分支验证，通过测试后再合并到 `main`。

## 详细文档

- [宠馨智项目完整总档案](docs/宠馨智项目完整总档案.md)
- [后端部署清单](docs/BACKEND_DEPLOYMENT_CHECKLIST.md)
- [微信小程序架构](docs/WECHAT_MINIPROGRAM_ARCHITECTURE.md)
- [GitHub使用与迁移指南](docs/GITHUB使用与迁移指南.md)

