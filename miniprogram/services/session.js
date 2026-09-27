const KEY = 'chongxinzhi-session-v1';

function load() {
  return wx.getStorageSync(KEY) || null;
}

function save(value) {
  wx.setStorageSync(KEY, value);
  getApp().globalData.session = value;
}

function clear() {
  wx.removeStorageSync(KEY);
  getApp().globalData.session = null;
}

module.exports = { load, save, clear };
