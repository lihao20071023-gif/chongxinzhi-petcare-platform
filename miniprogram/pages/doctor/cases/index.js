const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { items: [], error: '', query: '' },
  onShow() { if (requireRole(['doctor'])) this.load(); },
  input(event) { this.setData({ query: event.detail.value }); },
  async load() { try { const result = await api.request(`/doctor/cases?q=${encodeURIComponent(this.data.query)}`); this.setData({ items: result.items || [], error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  openCase(event) { wx.navigateTo({ url: `/pages/doctor/case-detail/index?id=${event.currentTarget.dataset.id}` }); }
});
