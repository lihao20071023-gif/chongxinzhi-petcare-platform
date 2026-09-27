const api = require('../../services/api');
const session = require('../../services/session');
const { routeForRole } = require('../../utils/role-router');

Page({
  data: { loading: false, error: '', selectedRole: 'pet_owner' },
  selectRole(event) { this.setData({ selectedRole: event.currentTarget.dataset.role, error: '' }); },
  login() {
    this.setData({ loading: true, error: '' });
    wx.login({
      success: async ({ code }) => {
        try {
          const result = await api.wechatLogin(code, this.data.selectedRole);
          const next = {
            accessToken: result.accessToken,
            expiresAt: result.expiresAt,
            role: result.user.role,
            user: result.user,
            doctorStatus: result.user.doctorStatus || null
          };
          session.save(next);
          wx.reLaunch({ url: routeForRole(next.role, next.doctorStatus) });
        } catch (error) {
          this.setData({ error: error.message, loading: false });
        }
      },
      fail: () => this.setData({ error: '微信登录失败，请稍后重试。', loading: false })
    });
  }
});
