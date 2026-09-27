# 宠馨智 GitHub 使用与迁移指南

## GitHub能为宠馨智做什么

1. 保存每一次代码版本，改坏后可以回到已确认版本。
2. 使用独立分支测试新功能，不覆盖 `main`。
3. 技术开发、设计和测试人员可以在同一个私有仓库协作。
4. 换Mac或Windows电脑后可以重新克隆项目。
5. 可以接入自动构建、代码审查和后续云端部署。

GitHub不是数据库，也不会保存当前浏览器的本机打卡、宠物档案或管理员账号。正式用户数据必须进入宠馨智自己的数据库。

## 首次上传：推荐使用私有仓库

项目尚未正式发布，医疗规则、产品路线和商业设计都属于重要资产，首次上传建议选择 **Private repository（私有仓库）**。

### 使用GitHub Desktop

1. 打开GitHub Desktop并登录自己的GitHub账号。
2. 选择 `File` → `Add Local Repository`。
3. 选择项目目录：

   ```text
   /Users/lihao/Documents/Codex/2026-07-20/name-petcare-ai-butler-version-1
   ```

4. 确认当前分支为 `main`，能看到基线提交。
5. 点击 `Publish repository`。
6. 仓库名称建议：`chongxinzhi-petcare-platform`。
7. 保持 `Keep this code private` 为选中状态。
8. 发布完成后，再在分支菜单确认 `codex/petcare-sandbox`，点击 `Publish branch`。

点击 `Publish repository` 会把代码上传到GitHub。上传前再次确认仓库是私有的，并确认提交列表里没有 `.env.api`。

## 日常使用

### 正式版本

```bash
git switch main
git pull
```

### 试错版本

```bash
git switch codex/petcare-sandbox
```

建议每完成一个完整小功能提交一次：

```bash
git add -A
git commit -m "feat: 简短说明本次功能"
git push
```

### 试错成功后合并

```bash
git switch main
git merge codex/petcare-sandbox
git push
```

合并前必须运行：

```bash
pnpm api:check
pnpm api:test
pnpm build
```

## 换到Windows电脑

1. 安装 Git、GitHub Desktop、Node.js 22、pnpm、微信开发者工具和Docker Desktop。
2. 在GitHub Desktop选择 `Clone repository`。
3. 克隆私有的宠馨智仓库。
4. 在项目目录运行：

   ```bash
   pnpm install
   pnpm build
   pnpm preview:static
   ```

5. 单独、安全地把 `.env.api` 配置到新电脑；不要通过GitHub传递真实密钥。

## 绝对不要上传的内容

- `.env.api` 和其他真实 `.env` 文件；
- 微信AppSecret；
- Supabase Service Role Key和JWT Secret；
- 大模型API Key；
- 管理员密码；
- 未经授权的真实宠物病历和宠主个人信息；
- `node_modules`、构建缓存、运行日志、测试视频和大型迁移压缩包。

项目的 `.gitignore` 已经排除了上述本地配置和大文件，但每次上传前仍应检查一次GitHub Desktop的文件列表。

## 源码压缩包和GitHub仓库的区别

- GitHub仓库用于持续开发、版本管理和团队协作；
- 源码压缩包用于离线备份或一次性交付；
- 压缩包不包含提交历史，不能替代GitHub；
- 两者都不应包含真实密钥和用户隐私数据。

