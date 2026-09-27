# 宠馨智微信小程序

这是唯一的微信小程序工程，宠主和医生共用。不要复制成两个工程。

## 本地打开

1. 安装并打开“微信开发者工具”。
2. 点击“导入项目”。
3. 选择本目录：`miniprogram/`。
4. 没有正式 AppID 时可先使用测试号查看页面；联调微信登录必须换成正式 AppID。
5. 部署统一 API 后，在 `config.js` 填写 `apiBaseUrl`。

## 页面权限

- `pages/owner/*`：仅 `pet_owner`
- `pages/doctor/*`：仅 `doctor`
- 医生未通过医院绑定审核，只能进入 `pages/doctor/hospital-bind`
- 管理员功能不在本工程中

所有页面权限都必须由后端和数据库再次校验，不能只相信本地缓存。
