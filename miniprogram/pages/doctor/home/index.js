const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { hospital: null, stats: { cases: 0, alerts: 0, followups: 0 }, error: '' },
  onShow() { if (requireRole(['doctor'])) this.load(); },
  async load() { try { const result = await api.request('/doctor/dashboard'); this.setData({ ...result, error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  open(event) { wx.navigateTo({ url: event.currentTarget.dataset.url }); }
});
