const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { caseId: '', detail: null, error: '', loading: true },
  onLoad(options) { if (!requireRole(['doctor'])) return; this.setData({ caseId: options.id || '' }); this.load(); },
  async load() { try { const detail = await api.request(`/cases/${this.data.caseId}`); this.setData({ detail, loading: false, error: '' }); } catch (error) { this.setData({ error: error.message, loading: false }); } },
  createOrder() { wx.navigateTo({ url: `/pages/doctor/order/index?caseId=${this.data.caseId}` }); }
});
