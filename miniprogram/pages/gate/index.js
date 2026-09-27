const api = require('../../services/api');
const session = require('../../services/session');
const { routeForRole } = require('../../utils/role-router');

Page({
  data: { message: '正在确认账号权限…' },
  async onLoad() {
    const current = session.load();
    if (!current) { wx.reLaunch({ url: '/pages/login/index' }); return; }
    try {
      const result = await api.request('/me');
      const next = { ...current, role: result.user.role, user: result.user, doctorStatus: result.user.doctorStatus || null };
      session.save(next);
      wx.reLaunch({ url: routeForRole(next.role, next.doctorStatus) });
    } catch (error) {
      this.setData({ message: error.message });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/index' }), 1500);
    }
  }
});
