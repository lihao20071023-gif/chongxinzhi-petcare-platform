const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { loading: true, error: '', pet: null, taskCount: 0, completedCount: 0 },
  onShow() { if (requireRole(['pet_owner'])) this.load(); },
  async load() {
    try {
      const result = await api.request('/owner/dashboard');
      this.setData({ ...result, loading: false, error: '' });
    } catch (error) { this.setData({ error: error.message, loading: false }); }
  },
  open(event) { wx.navigateTo({ url: event.currentTarget.dataset.url }); }
});
