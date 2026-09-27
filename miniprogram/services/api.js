const config = require('../config');
const session = require('./session');

function request(path, options = {}) {
  if (!config.apiBaseUrl) {
    return Promise.reject(new Error('尚未配置后端API地址，请先部署统一API服务并填写 miniprogram/config.js。'));
  }

  const current = session.load();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBaseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      timeout: config.requestTimeoutMs,
      header: {
        'content-type': 'application/json',
        ...(current && current.accessToken ? { Authorization: `Bearer ${current.accessToken}` } : {})
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        const message = response.data && response.data.error && response.data.error.message
          ? response.data.error.message
          : `请求失败（${response.statusCode}）`;
        if (response.statusCode === 401) session.clear();
        reject(new Error(message));
      },
      fail(error) { reject(new Error(error.errMsg || '网络请求失败')); }
    });
  });
}

function wechatLogin(code, requestedRole) {
  return request('/auth/wechat', { method: 'POST', data: { code, requestedRole } });
}

function uploadSignedFile(signedUrl, filePath, contentType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success(file) {
        wx.request({
          url: signedUrl,
          method: 'PUT',
          data: file.data,
          timeout: Math.max(config.requestTimeoutMs, 30000),
          header: {
            'content-type': contentType,
            'cache-control': 'max-age=3600',
            'x-upsert': 'false'
          },
          success(response) {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(response.data || {});
              return;
            }
            reject(new Error(`文件上传失败（${response.statusCode}）`));
          },
          fail(error) { reject(new Error(error.errMsg || '文件上传失败')); }
        });
      },
      fail(error) { reject(new Error(error.errMsg || '无法读取所选文件')); }
    });
  });
}

module.exports = { request, wechatLogin, uploadSignedFile };
